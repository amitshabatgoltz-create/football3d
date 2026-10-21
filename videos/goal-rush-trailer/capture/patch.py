import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a, s.count(a))
    s = s.replace(a, b)
rep('Bw.render(OB,dB),w&&', '(window.R3={Bw:Bw,OB:OB,dB:dB,c:c,pA:pA,h:h,RA:RA},window.CAM3&&window.__isoR(window.CAM3),window.NORENDER3||window.__isoR(()=>Bw.render(OB,window.CAMX||dB))),w&&')
rep('ZC.visible=aP.visible=!h.celCam', 'ZC.visible=aP.visible=!h.celCam&&!window.NOMARK3')
rep('B.acc>=1/30){B.acc=0;', 'B.acc>=1/30&&!window.NORENDER3){B.acc=0;')
css = '<style>#hud,#clkb,#setc,#pkb,#toss,#msg,#jzone,#joy,.bt,#pwb,#keys,#gpdiag,#toast,#bPause,#end{display:none!important}</style>'
i = s.rindex('</head>')
s = s[:i] + css + s[i:]
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
