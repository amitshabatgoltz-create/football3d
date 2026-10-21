import json, sys
seed = int(sys.argv[1])
L = json.load(open(f'sim-{seed}.json'))['log']
team = lambda i: -1 if i < 0 else (0 if i < 7 else 1)
gk = {0, 7}
tackles, saves, runs = [], [], []
i = 1
while i < len(L):
    a, b = L[i-1][5], L[i][5]
    if a >= 0 and b >= 0 and team(a) != team(b) and b not in gk and L[i][10] == 1 and L[i][4] < 9:
        tackles.append((i, a, b, L[i][1], L[i][3]))
    if b in gk and a == -1 and max(r[4] for r in L[max(0,i-10):i]) > 18:
        saves.append((i, b, L[i][1]))
    i += 1
# possession runs
cur, start = None, 0
for i, r in enumerate(L):
    if r[5] != cur:
        if cur is not None and cur >= 0 and cur not in gk and i - start > 60:
            dx = abs(L[i-1][1] - L[start][1])
            runs.append((start, i, cur, round((i - start) / 30, 1), round(dx, 1)))
        cur, start = r[5], i
print('tackles', len(tackles), tackles[:25])
print('saves', saves)
print('runs', sorted(runs, key=lambda r: -r[4])[:15])
