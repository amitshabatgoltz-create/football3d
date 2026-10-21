# grade rendered shots into the project: punchier contrast, richer grass, slight S-curve
set -e
# usage: grade.sh SHOTS_DIR
SRC="${1:-shots}"; DST="$(cd "$(dirname "$0")/.." && pwd)/assets/clips4"
mkdir -p "$DST"
for f in "$SRC"/*.mp4; do
  n=$(basename "$f")
  ffmpeg -v error -y -i "$f" -vf "eq=contrast=1.1:saturation=1.3:gamma=1.18:brightness=0.02,curves=master='0/0.02 0.5/0.55 1/1',unsharp=5:5:0.35" -c:v libx264 -crf 17 -preset slow -pix_fmt yuv420p -an "$DST/$n"
done
ls -la "$DST"
