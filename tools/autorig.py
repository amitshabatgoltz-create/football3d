#!/usr/bin/env python3
"""Auto-rig a standing humanoid GLB (e.g. from Meshy / Tripo) for football3d.

Usage:  python3 tools/autorig.py input.glb output.glb [--height 1.8] [--keep-texture]

- Finds joints from the body proportions (model must stand upright, facing +z,
  arms down by the sides).
- Skins every vertex to the nearest bone *along the surface* (geodesic), so
  arms that touch the body still get assigned to the arm, then smooths the
  weights so joints bend softly.
- Splits the mesh into kit parts (skin, hair, shirt, shorts, socks, boots) with
  separate materials, so the game can recolor the kit per team. With
  --keep-texture an existing base-color texture + UVs is kept instead.

Joint node names match FootballCharacter.JOINTS in character.js.
"""
import argparse, heapq, json, struct
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree

# ---------------------------------------------------------------- GLB I/O
def read_glb(path):
    d = open(path, "rb").read()
    jl = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    off = 20 + jl
    binc = b""
    if off < len(d):
        bl = struct.unpack("<I", d[off:off + 4])[0]
        binc = d[off + 8:off + 8 + bl]
    return j, binc

COMP = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

def accessor(j, binc, i):
    a = j["accessors"][i]
    bv = j["bufferViews"][a["bufferView"]]
    n = NCOMP[a["type"]]
    dt = np.dtype(COMP[a["componentType"]])
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0) or dt.itemsize * n
    raw = np.frombuffer(binc, dtype=np.uint8, count=stride * (a["count"] - 1) + dt.itemsize * n, offset=start)
    out = np.lib.stride_tricks.as_strided(raw, shape=(a["count"], dt.itemsize * n), strides=(stride, 1)).copy()
    out = out.view(dt).reshape(a["count"], n)
    if a.get("normalized") and dt.kind in "iu":
        out = out.astype(np.float32) / np.iinfo(dt).max
    return out

def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], dtype=np.float64).reshape(4, 4).T
    t = np.array(n.get("translation", [0, 0, 0]), dtype=np.float64)
    q = np.array(n.get("rotation", [0, 0, 0, 1]), dtype=np.float64)
    s = np.array(n.get("scale", [1, 1, 1]), dtype=np.float64)
    x, y, z, w = q
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t
    return M

def load_mesh(path):
    """All triangles of the scene, baked to world space. Returns P, F, UV, image."""
    j, binc = read_glb(path)
    Ps, Fs, UVs = [], [], []
    image = None
    def walk(ni, parent):
        n = j["nodes"][ni]
        M = parent @ node_matrix(n)
        if "mesh" in n:
            for prim in j["meshes"][n["mesh"]]["primitives"]:
                if prim.get("mode", 4) != 4:
                    continue
                P = accessor(j, binc, prim["attributes"]["POSITION"]).astype(np.float64)
                P = (M[:3, :3] @ P.T).T + M[:3, 3]
                F = accessor(j, binc, prim["indices"]).reshape(-1, 3).astype(np.int64) if "indices" in prim \
                    else np.arange(len(P)).reshape(-1, 3)
                if np.linalg.det(M[:3, :3]) < 0:
                    F = F[:, ::-1]
                uv = accessor(j, binc, prim["attributes"]["TEXCOORD_0"]) if "TEXCOORD_0" in prim["attributes"] else None
                base = sum(len(p) for p in Ps)
                Ps.append(P); Fs.append(F + base)
                UVs.append(uv if uv is not None else np.zeros((len(P), 2), np.float32))
                nonlocal image
                if image is None and "material" in prim:
                    mat = j["materials"][prim["material"]]
                    tex = mat.get("pbrMetallicRoughness", {}).get("baseColorTexture")
                    if tex is not None:
                        img = j["images"][j["textures"][tex["index"]]["source"]]
                        bv = j["bufferViews"][img["bufferView"]]
                        o = bv.get("byteOffset", 0)
                        image = (img.get("mimeType", "image/png"), binc[o:o + bv["byteLength"]])
        for c in n.get("children", []):
            walk(c, M)
    for r in j["scenes"][j.get("scene", 0)]["nodes"]:
        walk(r, np.eye(4))
    return np.vstack(Ps), np.vstack(Fs), np.vstack(UVs).astype(np.float32), image

# ---------------------------------------------------------------- rigging
def estimate_joints(P, H):
    """Joint positions (model faces +z, its right side is -x)."""
    y = P[:, 1]
    Yn = y / H
    band = lambda a, b: (Yn >= a) & (Yn < b)
    cx = np.median(P[band(0.3, 0.8), 0])
    X = P[:, 0] - cx
    def cen(mask):
        return np.median(P[mask], 0) if mask.sum() else None
    core = np.abs(X) < 0.07 * H
    J = {}
    for side, s in (("R", -1), ("L", 1)):
        leg = lambda a, b: band(a, b) & (s * X > 0.01 * H)
        ank = cen(leg(0.045, 0.07)); kn = cen(leg(0.255, 0.275))
        J["ankle" + side] = np.array([ank[0], 0.055 * H, ank[2] - 0.01 * H])
        J["knee" + side] = np.array([kn[0], 0.265 * H, kn[2]])
        J["hip" + side] = np.array([cx + 0.8 * (kn[0] - cx), 0.475 * H, cen(band(0.46, 0.5) & core)[2]])
        # arms: outermost part of each band is arm
        def arm_c(a, b):
            m = band(a, b) & (s * X > 0)
            xs = s * X[m]
            far = xs.max()
            return cen(np.where(m)[0][xs > far - 0.045 * H])
        sh_band = band(0.755, 0.775) & (s * X > 0)
        half = (s * X[sh_band]).max()
        J["shoulder" + side] = np.array([cx + s * (half - 0.055 * H), 0.765 * H, cen(band(0.74, 0.78) & core)[2]])
        el = arm_c(0.615, 0.635)
        J["elbow" + side] = np.array([el[0], 0.625 * H, el[2]])
        J["_wrist" + side] = arm_c(0.5, 0.52)
        J["_hand" + side] = arm_c(0.44, 0.47)
    J["body"] = np.array([cx, 0.0, cen(band(0.45, 0.55) & core)[2]])
    J["hips"] = np.array([cx, 0.5 * H, cen(band(0.46, 0.54) & core)[2]])
    J["spine"] = np.array([cx, 0.53 * H, cen(band(0.5, 0.56) & core)[2]])
    neck = cen(band(0.825, 0.845))
    J["neck"] = np.array([neck[0], 0.8 * H, neck[2]])
    head = cen(band(0.86, 0.98))
    J["head"] = np.array([neck[0], 0.845 * H, neck[2]])
    J["_top"] = np.array([head[0], 1.0 * H, head[2]])
    return J

PARENT = {"body": None, "hips": "body", "spine": "hips", "neck": "spine", "head": "neck",
          "shoulderL": "spine", "elbowL": "shoulderL", "shoulderR": "spine", "elbowR": "shoulderR",
          "hipL": "hips", "kneeL": "hipL", "ankleL": "kneeL", "hipR": "hips", "kneeR": "hipR", "ankleR": "kneeR"}
ORDER = list(PARENT)

def bone_segments(J, H):
    """Axis segment per deforming bone, used to seed the geodesic labeling."""
    seg = {}
    for s in "LR":
        seg["shoulder" + s] = (J["shoulder" + s], J["elbow" + s])
        seg["elbow" + s] = (J["elbow" + s], J["_hand" + s])
        seg["hip" + s] = (J["hip" + s], J["knee" + s])
        seg["knee" + s] = (J["knee" + s], J["ankle" + s])
        seg["ankle" + s] = (J["ankle" + s], J["ankle" + s] + np.array([0, -0.04 * H, 0.08 * H]))
    seg["hips"] = (J["hips"] + [0, -0.05 * H, 0], J["spine"])
    seg["spine"] = (J["spine"] + [0, 0.04 * H, 0], J["neck"] - [0, 0.04 * H, 0])
    seg["neck"] = (J["neck"], J["head"])
    seg["head"] = (J["head"] + [0, 0.03 * H, 0], J["_top"] - [0, 0.04 * H, 0])
    return seg

def arm_masks(P, H, J):
    """Arms usually touch the body in AI-generated models, so surface distance
    can't tell arm from shirt. Instead cut each horizontal band at the arm's
    inner edge: outermost point of the band minus the arm's thickness."""
    Yn = P[:, 1] / H
    X = P[:, 0] - J["hips"][0]
    out = {}
    bands = np.arange(0.43, 0.79, 0.01)
    for side, s in (("R", -1), ("L", 1)):
        edge = []
        for f in bands:
            m = (Yn >= f) & (Yn < f + 0.01) & (s * X > 0)
            edge.append((s * X[m]).max() if m.any() else np.nan)
        edge = np.array(edge)
        # smooth the outer edge a little (median of 3)
        edge = np.array([np.nanmedian(edge[max(0, i - 1):i + 2]) for i in range(len(edge))])
        thick = np.interp(bands, [0.43, 0.5, 0.52, 0.74, 0.79], [0.032, 0.032, 0.042, 0.052, 0.06]) * H
        cut = np.interp(Yn, bands + 0.005, edge - thick)
        arm = (s * X > cut) & (Yn >= 0.43) & (Yn < 0.785)
        el = J["elbow" + side][1]
        out["shoulder" + side] = arm & (P[:, 1] >= el)
        out["elbow" + side] = arm & (P[:, 1] < el)
    return out

def rig(P, F, H):
    J = estimate_joints(P, H)
    arms = arm_masks(P, H, J)
    segs = bone_segments(J, H)
    bones = list(segs)
    # mesh graph
    e = np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    w = np.linalg.norm(P[e[:, 0]] - P[e[:, 1]], axis=1) + 1e-9
    n = len(P)
    G = coo_matrix((np.r_[w, w], (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
    tree = cKDTree(P)
    # seeds: whole rings of surface between the joints of each bone, so the
    # geodesic split lands near the joints (front and back alike)
    Yn = P[:, 1] / H
    X = P[:, 0] - J["hips"][0]
    any_arm = np.any(np.stack(list(arms.values())), 0)
    band = lambda a, b: (Yn >= a) & (Yn < b) & ~any_arm
    yj = lambda k: J[k][1] / H
    ring = {"head": band(yj("head") + 0.05, 1.01), "neck": band(yj("neck") + 0.01, yj("head") - 0.005),
            "spine": band(yj("spine") + 0.06, yj("neck") - 0.05), "hips": band(yj("hips") - 0.02, yj("spine") - 0.005)}
    for side, sg in (("R", -1), ("L", 1)):
        ss = sg * X > 0.012 * H
        ring["hip" + side] = band(yj("knee" + side) + 0.06, yj("hip" + side) - 0.07) & ss
        ring["knee" + side] = band(yj("ankle" + side) + 0.04, yj("knee" + side) - 0.05) & ss
        ring["ankle" + side] = band(-0.01, yj("ankle" + side) - 0.015) & (sg * X > 0)
    dist = np.full((len(bones), n), np.inf)
    for bi, b in enumerate(bones):
        seeds = np.where(arms[b] if b in arms else ring[b])[0]
        if not len(seeds):
            a, c = segs[b]
            _, idx = tree.query([a + (c - a) * t for t in np.linspace(0.3, 0.7, 5)], k=6)
            seeds = np.unique(idx.ravel())
        dist[bi] = dijkstra(G, indices=seeds, min_only=True)
    label = dist.argmin(0)
    for b, m in arms.items():
        label[m] = bones.index(b)
    # nothing outside the arm cut belongs to an arm
    arm_ids = [bones.index(b) for b in arms]
    stray = np.isin(label, arm_ids) & ~np.any(np.stack(list(arms.values())), 0)
    if stray.any():
        d = dist.copy(); d[arm_ids] = np.inf
        label[stray] = d[:, stray].argmin(0)
    # unreachable islands: fall back to euclidean distance to bone axes
    bad = ~np.isfinite(dist.min(0))
    if bad.any():
        def segdist(p, a, c):
            ab = c - a; t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
            return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
        d2 = np.stack([segdist(P[bad], *segs[b]) for b in bones])
        label[bad] = d2.argmin(0)
    W = np.zeros((n, len(bones))); W[np.arange(n), label] = 1
    # smooth weights across the surface for soft bends
    deg = np.asarray((G > 0).sum(1)).ravel()
    A = (G > 0).astype(np.float64)
    for _ in range(int(8)):
        W = 0.5 * W + 0.5 * (A @ W) / np.maximum(deg, 1)[:, None]
    # top-4, normalized
    top = np.argsort(-W, 1)[:, :4]
    tw = np.take_along_axis(W, top, 1)
    tw /= tw.sum(1, keepdims=True)
    joint_index = {b: ORDER.index(b) for b in bones}
    JI = np.vectorize(lambda k: joint_index[bones[k]])(top).astype(np.uint16)
    return J, JI, tw.astype(np.float32), np.array([bones[k] for k in label])

# ---------------------------------------------------------------- kit painting
def paint(P, H, J, label):
    """Region per vertex: skin / hair / shirt / shorts / socks / boots."""
    Yn = P[:, 1] / H
    region = np.full(len(P), "skin", dtype=object)
    arm_up = np.isin(label, ["shoulderL", "shoulderR"])
    torso = np.isin(label, ["spine", "hips"])
    region[(torso | arm_up) & (Yn > 0.47) & (Yn < 0.808)] = "shirt"
    # short sleeves end a little above the elbow
    for s in "LR":
        m = (label == "shoulder" + s) & (P[:, 1] < J["elbow" + s][1] + 0.025 * H)
        region[m] = "skin"
    legs = np.isin(label, ["hipL", "hipR", "hips"])
    region[legs & (Yn <= 0.5) & (Yn > 0.285)] = "shorts"
    region[np.isin(label, ["hips"]) & (Yn <= 0.47)] = "shorts"
    region[(Yn < 0.2) & (Yn >= 0.05)] = "socks"
    region[Yn < 0.05] = "boots"
    # hair: top of head, plus back & sides above the ears
    head = np.isin(label, ["head", "neck"])
    hc = J["head"]; top = J["_top"]
    zrel = P[:, 2] - hc[2]
    hy = (P[:, 1] - hc[1]) / (top[1] - hc[1])          # 0 at head joint, 1 at crown
    hair = head & ((hy > 0.6) | ((zrel < 0.0) & (hy > 0.3)) | ((zrel < -0.03 * H) & (hy > 0.12)))
    region[hair] = "hair"
    return region

# ---------------------------------------------------------------- GLB writer
COLORS = {"skin": [0.86, 0.62, 0.48], "hair": [0.12, 0.08, 0.055], "shirt": [0.23, 0.51, 0.96],
          "shorts": [0.95, 0.95, 0.95], "socks": [0.23, 0.51, 0.96], "boots": [0.05, 0.05, 0.05],
          "textured": [1, 1, 1]}

def vertex_normals(P, F):
    N = np.zeros_like(P)
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    return (N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)).astype(np.float32)

def write_glb(path, P, F, N, UV, JI, WT, J, parts, image):
    blobs, views, accs = [], [], []
    def add(arr, target=None, kind=None, minmax=False):
        arr = np.ascontiguousarray(arr)
        off = sum(len(b) for b in blobs)
        data = arr.tobytes(); data += b"\0" * ((4 - len(data) % 4) % 4)
        blobs.append(data)
        v = {"buffer": 0, "byteOffset": off, "byteLength": arr.nbytes}
        if target: v["target"] = target
        views.append(v)
        ct = {np.dtype("float32"): 5126, np.dtype("uint16"): 5123, np.dtype("uint32"): 5125, np.dtype("uint8"): 5121}[arr.dtype]
        a = {"bufferView": len(views) - 1, "componentType": ct, "count": len(arr), "type": kind}
        if minmax:
            a["min"] = arr.min(0).tolist(); a["max"] = arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1
    attrs = {"POSITION": add(P.astype(np.float32), 34962, "VEC3", True),
             "NORMAL": add(N, 34962, "VEC3"),
             "JOINTS_0": add(JI.astype(np.uint16), 34962, "VEC4"),
             "WEIGHTS_0": add(WT, 34962, "VEC4")}
    if image is not None:
        attrs["TEXCOORD_0"] = add(UV, 34962, "VEC2")
    materials, prims = [], []
    for name, tri in parts:
        if not len(tri):
            continue
        lin = [round(c ** 2.2, 4) for c in COLORS[name]]
        m = {"name": name, "pbrMetallicRoughness": {"baseColorFactor": lin + [1], "metallicFactor": 0.0,
                                                    "roughnessFactor": 0.85 if name != "boots" else 0.4}}
        if name == "textured":
            m["pbrMetallicRoughness"]["baseColorTexture"] = {"index": 0}
        materials.append(m)
        prims.append({"attributes": attrs, "indices": add(tri.astype(np.uint32).ravel(), 34963, "SCALAR"),
                      "material": len(materials) - 1})
    # nodes: 0 = scene root "player", 1 = skinned mesh, 2.. = joints
    nodes = [{"name": "player", "children": [1, 2]}, {"name": "playerMesh", "mesh": 0, "skin": 0}]
    jn = {}
    for b in ORDER:
        jn[b] = len(nodes)
        par = PARENT[b]
        t = J[b] - (J[par] if par else 0)
        nodes.append({"name": b, "translation": [float(v) for v in t]})
    for b in ORDER:
        if PARENT[b]:
            nodes[jn[PARENT[b]]].setdefault("children", []).append(jn[b])
    ibm = np.stack([np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [-J[b][0], -J[b][1], -J[b][2], 1]], np.float32)
                    for b in ORDER]).reshape(-1, 16)
    ibm_acc = add(ibm, None, "MAT4")
    gl = {"asset": {"version": "2.0", "generator": "football3d autorig"},
          "scene": 0, "scenes": [{"nodes": [0]}], "nodes": nodes,
          "meshes": [{"name": "player", "primitives": prims}], "materials": materials,
          "skins": [{"joints": [jn[b] for b in ORDER], "skeleton": jn["body"], "inverseBindMatrices": ibm_acc}],
          "accessors": accs, "bufferViews": views}
    if image is not None:
        mime, data = image
        off = sum(len(b) for b in blobs)
        blobs.append(data + b"\0" * ((4 - len(data) % 4) % 4))
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(data)})
        gl["images"] = [{"bufferView": len(views) - 1, "mimeType": mime}]
        gl["textures"] = [{"source": 0, "sampler": 0}]
        gl["samplers"] = [{"magFilter": 9729, "minFilter": 9987}]
    binc = b"".join(blobs)
    gl["buffers"] = [{"byteLength": len(binc)}]
    js = json.dumps(gl, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    out = struct.pack("<III", 0x46546C67, 2, 28 + len(js) + len(binc))
    out += struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(binc), 0x004E4942) + binc
    open(path, "wb").write(out)

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input"); ap.add_argument("output")
    ap.add_argument("--height", type=float, default=1.8)
    ap.add_argument("--keep-texture", action="store_true")
    ap.add_argument("--js", action="store_true", help="also write OUTPUT.js (data URL, works from file://)")
    a = ap.parse_args()
    P, F, UV, image = load_mesh(a.input)
    keep = image is not None and a.keep_texture
    if not keep:
        image = None
    # stand on y=0, scale to target height, center x/z
    P = P - [0, P[:, 1].min(), 0]
    P *= a.height / P[:, 1].max()
    P[:, [0, 2]] -= np.median(P[(P[:, 1] > 0.3 * a.height)][:, [0, 2]], 0)
    H = a.height
    # weld duplicate vertices (UV seams) so the surface graph is connected
    key = np.round(P / 1e-6).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel()
    Pw, Fw = P[first], inv[F]
    Fw = Fw[(Fw[:, 0] != Fw[:, 1]) & (Fw[:, 1] != Fw[:, 2]) & (Fw[:, 0] != Fw[:, 2])]
    J, JI, WT, label = rig(Pw, Fw, H)
    if keep:
        JI, WT, label = JI[inv], WT[inv], label[inv]
    else:
        P, F, UV = Pw, Fw, UV[first]
    N = vertex_normals(P, F)
    if image is not None:
        parts = [("textured", F)]
    else:
        region = paint(P, H, J, label)
        # triangle region = region of the majority (first vertex on ties)
        R = region[F]
        tri_region = np.where(R[:, 1] == R[:, 2], R[:, 1], R[:, 0])
        parts = [(name, F[tri_region == name]) for name in ["skin", "hair", "shirt", "shorts", "socks", "boots"]]
    write_glb(a.output, P, F, N, UV, JI, WT, J, parts, image)
    if a.js:
        import base64
        b64 = base64.b64encode(open(a.output, "rb").read()).decode()
        open(a.output + ".js", "w").write("window.PLAYER_GLB = \"data:model/gltf-binary;base64," + b64 + "\";\n")
    print("joints:", {k: np.round(v, 3).tolist() for k, v in J.items() if not k.startswith("_")})
    print("vertices", len(P), "triangles", len(F), "->", a.output)

if __name__ == "__main__":
    main()
