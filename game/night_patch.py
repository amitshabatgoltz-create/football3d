"""Apply the night-lighting / bold-kits / spectacular-goals pass to the GOAL RUSH artifact HTML.

usage: python3 night_patch.py original.html patched.html
Every edit is an exact string replacement that must match once, so a changed build fails loudly.
"""
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, (a[:80], n)
    s = s.replace(a, b)


# night sky: near-black zenith fading to a faint blue glow at the stand line
rep('B.addColorStop(0,"#0b1a33"),B.addColorStop(.55,"#2e4a72"),B.addColorStop(1,"#6d8db5")',
    'B.addColorStop(0,"#010207"),B.addColorStop(.55,"#050b19"),B.addColorStop(1,"#18284a")')
rep('UB.fog=new BP(4678796,140,320)', 'UB.fog=new BP(527895,170,380)')
# dim cool ambient, hard white key from the floodlights
rep('UB.add(new mC(14674431,2767394,1.15))', 'UB.add(new mC(9480415,1054736,.5))')
rep('var xg=new uw(16774368,1.6)', 'var xg=new uw(15792383,1.55)')

# the stadium's eight floodlight poles get lit lamp heads: a hot core and a wide halo, both
# camera-facing discs with an additive radial glow (no extra scene lights, so no cost per pixel)
FLOOD = (
    '{let FT=(()=>{let c=document.createElement("canvas");c.width=c.height=128;let x=c.getContext("2d"),r=x.createRadialGradient(64,64,0,64,64,64);'
    'r.addColorStop(0,"#ffffff");r.addColorStop(.12,"#f2f7ff");r.addColorStop(.35,"#6f86b8");r.addColorStop(.7,"#1a2238");r.addColorStop(1,"#000000");'
    'x.fillStyle=r;x.fillRect(0,0,128,128);let t=new Eg(c);t.colorSpace=gB;return t})(),'
    'FP2=[[-51.6,-28.4],[50,-28.4],[-22.4,-35.4],[25.6,-35.4],[-51.8,28.6],[50,28.6],[-22.4,34.6],[25.6,34.6]];'
    'FP2.forEach(([x,z])=>{for(let[r,o]of[[2.4,1],[8,.45]]){'
    'let m=new jA(new og(r,r,.01,40),new jg({color:0,emissive:16777215,emissiveMap:FT,transparent:!0,opacity:o,depthWrite:!1,blending:2,fog:!1}));'
    'm.position.set(x*.985,19.4,z*.985);m.renderOrder=5;m.frustumCulled=!1;'
    'm.onBeforeRender=(R,S,C)=>{m.quaternion.copy(C.quaternion);m.rotateX(Math.PI/2);m.updateMatrixWorld()};UB.add(m)}})}'
)
rep('xg.shadow.normalBias=.03;', 'xg.shadow.normalBias=.03;' + FLOOD)

# pitch: broadcast-style mowing stripes with real contrast
rep('"#2f8f45":"#2a8540"', '"#2f9a49":"#1f7536"')

# bolder kits (same names and patterns; the dark ones get real colour)
rep("home:{n:'Home Navy',c:'#1B2A4A',a:'#22345a',t:'#EAF1FF',sh:'#0E1626',so:'#1B2A4A'",
    "home:{n:'Home Royal',c:'#1F56E0',a:'#2a64f0',t:'#FFFFFF',sh:'#FFFFFF',so:'#1F56E0'")
rep("mid:{n:'Midnight',c:'#0B1220',a:'#183456',t:'#38D6FF',sh:'#0B1220',so:'#0B1220'",
    "mid:{n:'Midnight',c:'#123A8C',a:'#38D6FF',t:'#38D6FF',sh:'#0B1220',so:'#123A8C'")
rep("neon:{n:'Neon Street',c:'#141A26',a:'#B8FF3B',t:'#B8FF3B',sh:'#141A26',so:'#141A26'",
    "neon:{n:'Neon Street',c:'#A6F02E',a:'#141A26',t:'#141A26',sh:'#141A26',so:'#A6F02E'")
rep("shadow:{n:'Shadow',c:'#1A1D24',a:'#262b36',t:'#8C97AE',sh:'#1A1D24',so:'#1A1D24'",
    "shadow:{n:'Shadow',c:'#59617A',a:'#6c7590',t:'#EAF1FF',sh:'#1A1D24',so:'#59617A'")

# more spectacular goals: harder, earlier strikes from the AI, and a faster ball for everyone
rep('t<23&&Math.random()<.55){let H=hA(.45,.95)', 't<27&&Math.random()<.5){let H=hA(.62,1)')
rep('I=bB(16,31,A)', 'I=bB(17,34,A)')

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
