import json, glob, math
rows = []
for fn in sorted(glob.glob('sim-*.json')):
    seed = int(fn[4:-5])
    if seed == 1: continue
    L = json.load(open(fn))['log']
    for i in range(1, len(L)):
        if L[i][6] != L[i-1][6]:
            g = i
            # walk back to the shot: last frame with an owner before the goal
            j = g - 1
            while j > 0 and L[j][5] == -1: j -= 1
            shooter, fs = L[j][5], j + 1
            k = j
            while k > 0 and L[k][5] == shooter: k -= 1
            poss = (j - k) / 30
            flight = L[fs:g+1]
            maxh = max(r[2] for r in flight)
            spd = max(r[4] for r in flight)
            dist = 45 - abs(L[j][1])
            rows.append(dict(seed=seed, goal=g, shot=fs, shooter=shooter, team=0 if shooter < 7 else 1, poss=round(poss, 1), flight=round((g - fs) / 30, 2), maxh=maxh, spd=spd, dist=round(dist, 1), z=L[j][3], score=L[g][6]))
for r in rows: print(r)
json.dump(rows, open('goals.json', 'w'))
