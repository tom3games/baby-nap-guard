// 寝かしつけ防衛戦。本体
// 遊び: 13:00〜15:00（2分）。吊りかごを端で押して揺らし続けながら、鳴る前の邪魔者をタップで止める。
// 眠り（鼻ちょうちん）が0になったら大泣きして、渋い顔で銃を構えて暗転。仕様の正本は ~/Desktop/claudecode/ideas/baby-nap-guard.md。文言は data.js
import * as THREE from 'three'
import { setupLook, surfaceTex, addCornerAO, addBlobShadow, look, createFx } from './look.js?v=1'
window.__jsUp = true
const BN = window.BN
const $ = id => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, k) => a + (b - a) * k
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k)
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
let lang = store.get('bn_lang') || ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en')
const L = p => p ? p[lang === 'en' ? 1 : 0] : ''
const T = k => L(BN.T[k])
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const params = new URLSearchParams(location.search)
let SIM = false

// ============================================================ 音（全部録音素材。CREDITS.md）
const S_ = n => 'snd/' + n + '.mp3'
Snd.def({
  creak: [S_('creak1'), S_('creak2'), S_('creak3')], jolt: S_('jolt'),
  wail: [S_('wail1'), S_('wail2'), S_('wail3')], fuss: [S_('fuss1'), S_('fuss2'), S_('fuss3')], coo: S_('coo'),
  bell: S_('bell'), bark: [S_('bark1'), S_('bark2'), S_('bark3')], horn: [S_('horn1'), S_('horn2')], sneeze: S_('sneeze'),
  buzz: [S_('buzz1'), S_('buzz2')], sms: S_('sms'), ring: S_('ring'), knock: S_('knock'), car: S_('car'), whistle: S_('whistle'),
  clockbell: S_('clockbell'), window: S_('window'), paper: S_('paper'), cock: S_('cock'), chew: S_('chew'), squeak: S_('squeak'), pop: S_('pop'),
  j_win: S_('j_win'), j_gekiga: S_('j_gekiga'), j_rare: S_('j_rare'), click: S_('click'),
})
let muted = store.get('bn_mute') === '1'
Snd.setMute(muted)
function sfx(name, o) { if (!SIM) Snd.play(name, o) }

// ============================================================ 3D の部屋（昼下がりのリビング）
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
const scene = new THREE.Scene()
scene.background = new THREE.Color('#2b2620')
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 30)
setupLook(renderer, scene, { exposure: 1.05, sun: 1.0, sunPos: [1.5, 3, -1.5], target: [0, 0.4, -0.6], hemi: 0.8, fill: 0.35 })
const fx = createFx(scene, camera, renderer)
const R = { x0: -1.05, x1: 1.05, z0: -1.9, h: 2.4 }
const texLoader = new THREE.TextureLoader()
const TEX = {}
const PAPERS = []
function tex(name) {
  if (TEX[name]) return TEX[name]
  const t = texLoader.load('img/' + name + '.webp', tt => { tt.userData.ok = true; for (const m of PAPERS) if (m.userData.tex === name) fitPaper(m) })
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[name] = t; return t
}
// 切り絵（足元が原点。高さ h、縦横比は画像から）
function paper(name, h, o = {}) {
  const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0)
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false }))
  m.userData = { tex: name, h, flip: false, face: o.face !== false }; PAPERS.push(m); fitPaper(m); (o.parent || scene).add(m); return m
}
function fitPaper(m) { const t = TEX[m.userData.tex], img = t && t.image; const a = img && img.width ? img.width / img.height : 1; m.scale.set(m.userData.h * a * (m.userData.flip ? -1 : 1), m.userData.h, 1) }
function setPaper(m, name, h) { if (h) m.userData.h = h; if (m.userData.tex !== name) { m.userData.tex = name; m.material.map = tex(name); m.material.needsUpdate = true } fitPaper(m) }
function plane(w, h, mat, pos, rot, parent = scene) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); if (rot) m.rotation.set(...rot); parent.add(m); return m }
function box(w, h, d, mat, pos, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...pos); parent.add(m); return m }
function cyl(rt, rb, h, mat, pos, seg = 28, parent = scene) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(...pos); parent.add(m); return m }
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}), ...(o.map ? { map: o.map } : {}) })
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t }

// 床（フローリング）とラグ
const floorTex = surfaceTex({ w: 512, h: 512, base: '#b98a5a', repeat: [2, 4], grime: 0.05, noise: 0.05, draw(x, w, h, r) {
  for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${90 + r() * 40},${55 + r() * 25},25,${0.12 + r() * 0.1})`; x.fillRect(i * w / 8, 0, w / 8 - 2, h); x.fillStyle = 'rgba(40,24,10,.35)'; x.fillRect(i * w / 8 - 1, 0, 2, h); x.fillRect(i * w / 8, (r() * h) | 0, w / 8, 2) }
} })
plane(2.1, 4.4, std('#ffffff', { map: floorTex, r: 0.6 }), [0, 0, 0.3], [-Math.PI / 2, 0, 0])
const rugTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e8dcc4'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9a77a'; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28); x.fillStyle = 'rgba(217,96,126,.18)'; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(40 + i * 44, 40 + j * 44, 7, 0, 7); x.fill() } })
const rug = plane(1.5, 1.3, std('#ffffff', { map: rugTex, r: 1 }), [0, 0.004, 0.15], [-Math.PI / 2, 0, 0])
// 壁（クリーム色のクロス）
const wallTex = surfaceTex({ w: 256, h: 256, base: '#ece2cf', repeat: [3, 2], grime: 0.05, noise: 0.05 })
const matWall = std('#ffffff', { map: wallTex, r: 1 })
const trim = std('#8a6a48', { r: 0.6 })
// 奥の壁: 左に廊下への入口（x -0.95〜-0.45 / 高さ1.9）、右に窓（x 0.15〜0.95 / y 0.95〜1.85）
const WIN = { x0: 0.15, x1: 0.95, y0: 0.95, y1: 1.85 }
plane(0.1, R.h, matWall, [-1.0, R.h / 2, R.z0])
plane(0.5, R.h - 1.9, matWall, [-0.7, 1.9 + (R.h - 1.9) / 2, R.z0])
plane(0.6, R.h, matWall, [-0.15, R.h / 2, R.z0])
plane(0.8, WIN.y0, matWall, [0.55, WIN.y0 / 2, R.z0])
plane(0.8, R.h - WIN.y1, matWall, [0.55, WIN.y1 + (R.h - WIN.y1) / 2, R.z0])
plane(0.1, R.h, matWall, [1.0, R.h / 2, R.z0])
plane(4.2, R.h, matWall, [R.x0, R.h / 2, 0.2], [0, Math.PI / 2, 0])
plane(4.2, R.h, matWall, [R.x1, R.h / 2, 0.2], [0, -Math.PI / 2, 0])
box(2.1, 0.08, 0.02, trim, [0, 0.04, R.z0 + 0.01])   // 幅木
box(0.02, 0.08, 4.2, trim, [R.x0 + 0.01, 0.04, 0.2]); box(0.02, 0.08, 4.2, trim, [R.x1 - 0.01, 0.04, 0.2])
addCornerAO(scene, { minX: R.x0, maxX: R.x1, minZ: R.z0, maxZ: 2.2, strength: 0.32, sides: 'LRB' })
// 廊下と玄関（すりガラスに人影が映る）
const hallZ = -2.75
plane(0.5, 0.86, std('#a8794c', { r: 0.6 }), [-0.7, 0.002, (R.z0 + hallZ) / 2], [-Math.PI / 2, 0, 0])
plane(0.86, 1.9, std('#e2d6bf'), [-0.95, 0.95, (R.z0 + hallZ) / 2], [0, Math.PI / 2, 0])
plane(0.86, 1.9, std('#e2d6bf'), [-0.45, 0.95, (R.z0 + hallZ) / 2], [0, -Math.PI / 2, 0])
box(0.5, 0.06, 0.86, std('#e2d6bf'), [-0.7, 1.93, (R.z0 + hallZ) / 2])
box(0.04, 1.9, 0.04, trim, [-0.95, 0.95, R.z0 + 0.01]); box(0.04, 1.9, 0.04, trim, [-0.45, 0.95, R.z0 + 0.01]); box(0.54, 0.04, 0.04, trim, [-0.7, 1.9, R.z0 + 0.01])
const doorC = document.createElement('canvas'); doorC.width = 128; doorC.height = 256
const doorT = new THREE.CanvasTexture(doorC); doorT.colorSpace = THREE.SRGBColorSpace
plane(0.46, 1.86, std('#6d5238', { r: 0.5 }), [-0.7, 0.93, hallZ])
const doorGlass = plane(0.22, 0.9, new THREE.MeshBasicMaterial({ map: doorT, toneMapped: false }), [-0.7, 1.15, hallZ + 0.01])
const hallLight = new THREE.PointLight('#fff1d8', 0.8, 2.2, 1.5); hallLight.position.set(-0.7, 1.6, -2.3); scene.add(hallLight)
// 窓の外（空・向かいの家・道）と、窓枠・カーテン・ガラス
const outTex = canvasTex(512, 256, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9cc6e8'); g.addColorStop(0.6, '#d9ecf4'); g.addColorStop(1, '#e9efe4'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  const houses = [[0, 120, 90, '#c7b59a'], [80, 100, 120, '#e2d2bd'], [190, 130, 70, '#b9a487'], [250, 90, 140, '#d8c6ac'], [380, 115, 132, '#c4ad92']]
  for (const [hx, hy, hw, c] of houses) { x.fillStyle = c; x.fillRect(hx, hy, hw, h - hy); x.fillStyle = '#6e5a48'; x.beginPath(); x.moveTo(hx - 6, hy); x.lineTo(hx + hw / 2, hy - 30); x.lineTo(hx + hw + 6, hy); x.fill(); x.fillStyle = 'rgba(80,110,140,.5)'; x.fillRect(hx + 14, hy + 20, 22, 18); x.fillRect(hx + hw - 36, hy + 20, 22, 18) }
  x.fillStyle = '#8f9a92'; x.fillRect(0, 200, w, 56); x.fillStyle = '#b7beb6'; x.fillRect(0, 198, w, 4)
  x.strokeStyle = '#4a4038'; x.lineWidth = 6; x.beginPath(); x.moveTo(440, 30); x.lineTo(440, 205); x.stroke(); x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 50); x.quadraticCurveTo(220, 80, 440, 40); x.lineTo(512, 46); x.stroke()
})
plane(3.2, 1.6, new THREE.MeshBasicMaterial({ map: outTex, toneMapped: false }), [0.5, 1.5, -4.2])
const outLight = new THREE.PointLight('#fff4dc', 1.4, 4, 1.4); outLight.position.set(0.55, 1.5, -1.5); scene.add(outLight)
const winFrame = std('#f4f0e8', { r: 0.5 })
box(0.84, 0.05, 0.08, winFrame, [0.55, WIN.y0, R.z0]); box(0.84, 0.05, 0.08, winFrame, [0.55, WIN.y1, R.z0])
box(0.05, WIN.y1 - WIN.y0, 0.08, winFrame, [WIN.x0, (WIN.y0 + WIN.y1) / 2, R.z0]); box(0.05, WIN.y1 - WIN.y0, 0.08, winFrame, [WIN.x1, (WIN.y0 + WIN.y1) / 2, R.z0])
const glassMat = new THREE.MeshStandardMaterial({ color: '#dceef6', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28 })
plane(0.4, WIN.y1 - WIN.y0, glassMat, [0.75, (WIN.y0 + WIN.y1) / 2, R.z0 - 0.02])   // はめ殺し側
const sash = new THREE.Group(); scene.add(sash)
plane(0.4, WIN.y1 - WIN.y0, glassMat, [0, 0, 0], null, sash); box(0.03, WIN.y1 - WIN.y0, 0.03, winFrame, [-0.19, 0, 0], sash)
sash.position.set(0.75, (WIN.y0 + WIN.y1) / 2, R.z0 + 0.015)   // 開いている（はめ殺しの前に重なる）
const curtainTex = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#9db8cf'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgba(40,70,100,.18)'; x.fillRect(i, 0, 3, h) } })
const curtL = plane(0.18, 1.1, std('#ffffff', { map: curtainTex }), [WIN.x0 - 0.02, 1.38, R.z0 + 0.05]); curtL.material.side = THREE.DoubleSide
const curtR = plane(0.18, 1.1, std('#ffffff', { map: curtainTex }), [WIN.x1 + 0.02, 1.38, R.z0 + 0.05]); curtR.material.side = THREE.DoubleSide
// ソファ（窓の下）とパパ
const sofaM = std('#6d8a7a', { r: 0.9 })
box(0.94, 0.26, 0.5, sofaM, [0.55, 0.2, -1.6]); box(0.94, 0.42, 0.14, sofaM, [0.55, 0.5, -1.82]); box(0.12, 0.38, 0.5, sofaM, [0.06, 0.29, -1.6]); box(0.12, 0.38, 0.5, sofaM, [1.04, 0.29, -1.6])
const papa = paper('p_nap', 0.44); papa.position.set(0.56, 0.27, -1.38)
// 壁掛けの鳩時計（奥の壁、廊下と窓のあいだ）
const clockG = new THREE.Group(); clockG.position.set(-0.17, 1.6, R.z0 + 0.04); scene.add(clockG)
const cw = std('#7a5332', { r: 0.55 })
box(0.22, 0.24, 0.08, cw, [0, 0, 0], clockG)
const roofL = box(0.17, 0.03, 0.1, std('#4e331e'), [-0.065, 0.15, 0], clockG); roofL.rotation.z = 0.6
const roofR = box(0.17, 0.03, 0.1, std('#4e331e'), [0.065, 0.15, 0], clockG); roofR.rotation.z = -0.6
const faceTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#f6eedb'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.strokeStyle = '#3a2a1a'; x.lineWidth = 5; x.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillStyle = '#3a2a1a'; x.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6) } })
const clockFace = cyl(0.07, 0.07, 0.01, std('#ffffff', { map: faceTex }), [0, -0.04, 0.045], 24, clockG); clockFace.rotation.x = Math.PI / 2
const clockHand = box(0.006, 0.05, 0.004, std('#2a1a10'), [0, -0.02, 0.052], clockG)
const clockDoor = box(0.06, 0.05, 0.01, std('#4e331e'), [0, 0.08, 0.045], clockG)
for (const sx of [-0.04, 0.04]) { box(0.004, 0.32, 0.004, std('#222'), [sx, -0.3, 0.02], clockG); cyl(0.018, 0.018, 0.06, std('#b08a3a', { m: 0.6, r: 0.3 }), [sx, -0.48, 0.02], 10, clockG) }
const cuckoo = paper('cuckoo', 0.2, { face: false }); cuckoo.visible = false
// 右の壁の額（壁の向こうが隣の部屋。カラオケで揺れる）
const artTex = canvasTex(160, 120, (x, w, h) => { x.fillStyle = '#f2ead6'; x.fillRect(0, 0, w, h); x.fillStyle = '#7fa36e'; x.beginPath(); x.ellipse(50, 80, 30, 26, 0, 0, 7); x.fill(); x.fillStyle = '#d9607e'; for (const [a, b] of [[40, 64], [62, 70], [50, 86], [96, 60], [118, 76]]) { x.beginPath(); x.arc(a, b, 9, 0, 7); x.fill() } x.fillStyle = '#e8b04a'; x.beginPath(); x.arc(126, 30, 14, 0, 7); x.fill() })
const frame = new THREE.Group(); frame.position.set(R.x1 - 0.02, 1.45, -1.45); frame.rotation.y = -Math.PI / 2; scene.add(frame)
box(0.5, 0.38, 0.03, std('#5a3d24', { r: 0.5 }), [0, 0, 0], frame); plane(0.42, 0.3, std('#ffffff', { map: artTex }), [0, 0, 0.017], null, frame)
// 犬のベッド（左）
cyl(0.25, 0.27, 0.08, std('#a9786a', { r: 1 }), [-0.5, 0.04, -0.85], 28)
cyl(0.2, 0.2, 0.05, std('#e8d8c0', { r: 1 }), [-0.5, 0.07, -0.85], 28)
const dog = paper('d_sleep', 0.3); dog.position.set(-0.5, 0.07, -0.81)
addBlobShadow(dog, 0.4, { opacity: 0.25 })
// 低いテーブルとスマホ（右）
box(0.5, 0.03, 0.34, std('#d9c29a', { r: 0.5 }), [0.55, 0.3, -0.88]); for (const [lx, lz] of [[0.33, -1.01], [0.77, -1.01], [0.33, -0.75], [0.77, -0.75]]) box(0.03, 0.29, 0.03, std('#a88a5e'), [lx, 0.145, lz])
const phoneC = document.createElement('canvas'); phoneC.width = 64; phoneC.height = 128
const phoneT = new THREE.CanvasTexture(phoneC); phoneT.colorSpace = THREE.SRGBColorSpace
const phone = new THREE.Group(); phone.position.set(0.56, 0.322, -0.86); scene.add(phone)
box(0.075, 0.012, 0.15, std('#1c1c20', { r: 0.3 }), [0, 0, 0], phone)
const phoneScreen = plane(0.066, 0.138, new THREE.MeshBasicMaterial({ map: phoneT, toneMapped: false }), [0, 0.007, 0], [-Math.PI / 2, 0, 0], phone)
const mug = cyl(0.03, 0.028, 0.07, std('#e6e2da', { r: 0.4 }), [0.4, 0.35, -0.8], 16)
// 上の子（廊下から忍び足）・宅配の人・選挙カー・焼き芋屋
const kid = paper('k_horn', 0.78); kid.visible = false
addBlobShadow(kid, 0.4, { opacity: 0.3 })
const car = paper('car', 0.42, { face: false }); car.visible = false
const imo = paper('imo', 0.42, { face: false }); imo.visible = false
// 天井と照明（昼なので弱い）
plane(2.1, 4.4, std('#f3eee4', { r: 1 }), [0, R.h, 0.3], [Math.PI / 2, 0, 0])
const ceilLamp = cyl(0.22, 0.26, 0.05, std('#fbf7ee', { e: '#fff3dc', ei: 0.5 }), [0, R.h - 0.03, -0.6], 32)
const lampLight = new THREE.PointLight('#fff0d6', 1.2, 6, 1.4); lampLight.position.set(0, 2.2, 0); scene.add(lampLight)

// ---- 吊りかご（スタンドの弧から下がっている。左右に振れる）
const PIVOT = new THREE.Vector3(0, 1.16, 0.32), ROPE = 0.74, MAXANG = 0.3
const standM = std('#c9a77a', { r: 0.45 })
const standCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, -0.12), new THREE.Vector3(0, 0.7, -0.14), new THREE.Vector3(0, 1.12, -0.06), new THREE.Vector3(0, 1.22, 0.14), new THREE.Vector3(0, 1.18, 0.32)])
const stand = new THREE.Mesh(new THREE.TubeGeometry(standCurve, 40, 0.025, 10), standM); scene.add(stand)
box(0.7, 0.03, 0.08, standM, [0, 0.015, -0.12]); box(0.08, 0.03, 0.5, standM, [0, 0.015, 0.0])
const hook = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16), std('#b8b0a0', { m: 0.7, r: 0.3 })); hook.position.copy(PIVOT); scene.add(hook)
const swing = new THREE.Group(); swing.position.copy(PIVOT); scene.add(swing)
const basketTex = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#e1bf86'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 10) for (let j = 0; j < h; j += 8) { x.fillStyle = ((i / 10 + j / 8) % 2) ? 'rgba(140,96,44,.35)' : 'rgba(255,240,210,.25)'; x.fillRect(i, j, 10, 8) } })
basketTex.wrapS = THREE.RepeatWrapping; basketTex.repeat.set(3, 1)
const basketMat = std('#ffffff', { map: basketTex, r: 0.85 })
const bowlGeo = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
const basket = new THREE.Mesh(bowlGeo, basketMat); basket.material.side = THREE.DoubleSide; basket.scale.set(0.37, 0.17, 0.22); basket.position.set(0, -ROPE, 0); swing.add(basket)
const rimMat = std('#c99a5a', { r: 0.6, e: '#ffcf7a', ei: 0 })
const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), rimMat); rim.rotation.x = Math.PI / 2; rim.scale.set(0.37, 0.22, 0.37); rim.position.set(0, -ROPE, 0); swing.add(rim)
const ropeM = std('#efe6d6', { r: 1 })
for (const [rx, rz] of [[-0.32, 0.1], [0.32, 0.1], [-0.32, -0.1], [0.32, -0.1]]) {
  const a = new THREE.Vector3(0, 0, 0), b = new THREE.Vector3(rx, -ROPE + 0.01, rz), len = a.distanceTo(b)
  const r = cyl(0.004, 0.004, len, ropeM, [rx / 2, (-ROPE + 0.01) / 2, rz / 2], 6, swing); r.lookAt(swing.localToWorld(b.clone())); r.rotateX(Math.PI / 2)
}
// かごの中の赤ちゃん（カメラの方へ少し起こす）と鼻ちょうちん
const babyPivot = new THREE.Group(); babyPivot.position.set(0, -ROPE - 0.06, 0.02); swing.add(babyPivot)
const baby = paper('b_deep', 0.36, { face: false, parent: babyPivot })
const bubbleMat = new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.62, emissive: '#7fb2e6', emissiveIntensity: 0.25 })
const noseBubble = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bubbleMat); babyPivot.add(noseBubble)
const shine = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })); shine.position.set(-0.35, 0.4, 0.75); noseBubble.add(shine)
// 鼻の位置（画像ごとの、左下を0とした割合）
const NOSE = { b_deep: [0.405, 0.6], b_light: [0.39, 0.6], b_fuss: [0.4, 0.6] }

// 音の出どころ（タップの的）
const SRC = {
  door: new THREE.Vector3(-0.7, 1.2, hallZ + 0.02),
  dog: new THREE.Vector3(-0.5, 0.22, -0.81),
  kid: new THREE.Vector3(-0.72, 0.55, -1.78),
  phone: new THREE.Vector3(0.56, 0.34, -0.86),
  frame: new THREE.Vector3(R.x1 - 0.03, 1.45, -1.45),
  papa: new THREE.Vector3(0.36, 0.6, -1.42),
  window: new THREE.Vector3(0.55, 1.4, R.z0),
  clock: new THREE.Vector3(-0.17, 1.62, R.z0 + 0.05),
}
const SRC_OF = { bell: 'door', dog: 'dog', kid: 'kid', phone: 'phone', gran: 'phone', karaoke: 'frame', sneeze: 'papa', car: 'window', imo: 'window', clock: 'clock' }

// ---- カメラ（かごの横に座っている自分の目。縦長ほど画角を広げる）
const CAM = { p: new THREE.Vector3(0, 1.3, 1.16), t: new THREE.Vector3(0.02, 0.7, -0.75) }
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h
  renderer.setSize(w, h, false); camera.aspect = a
  const hf = 62 * Math.PI / 180
  camera.fov = clamp(2 * Math.atan(Math.tan(hf / 2) / a) * 180 / Math.PI, 50, 92)
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

// ============================================================ 遊びの状態（sim でも同じ処理を回す）
const DUR = 120, W0 = 2 * Math.PI / 1.7, DAMP = 0.17, KICK = 0.45, WIN_K = 0.7, OK_LO = 0.3, OK_HI = 0.82, BUSY = 0.42, JOLT = 8
const TUT_KEY = 'bn_tut1'
const POOL = ['bell', 'dog', 'kid', 'phone', 'karaoke', 'sneeze', 'car']
const G = { mode: 'boot', t: 0, clock: 0, texts: { bubble: null, hint: null }, paused: false, speed: 1, playNo: 0, post: {}, postKind: {}, noises: [], S: 80, th: 0, v: 0, hist: [], log: [] }
let rng = mulberry(1)
const rnd = (a, b) => a + (b - a) * rng()

function newGame(seed, learn = false) {
  G.seed = seed; rng = mulberry(seed)
  G.t = 0; G.mode = 'play'; G.over = null; G.endT = 0
  G.S = 72; G.th = 0.5; G.v = 0; G.busy = 0
  G.good = 0; G.jolts = 0; G.prevented = 0; G.stopped = 0; G.through = 0; G.misses = 0
  G.sumS = 0; G.hist = []; G.log = []; G.events = []
  G.noises = []; G.post = {}   // post[src] = 片づけた後の見た目の残り秒
  G.next = learn ? 10 : 6.5; G.lastKinds = []
  G.carKind = params.has('imo') ? 'imo' : rng() < 0.3 ? 'imo' : 'car'
  G.granLeft = rng() < 0.4 ? 1 : 0
  G.clockDone = false
  G.eyeT = 0; G.eyeUsed = rng() < 0.6 ? false : true; G.popT = 0; G.popAt = null; G.bubbleOn = true; G.fussAt = 0; G.talkAt = rnd(18, 30); G.papaTalkAt = rnd(35, 50)
  G.strongT = 0
  G.learn = learn ? { push: 0, handled: 0, shown: '', joltT: 0 } : null
}
const progress = () => clamp(G.t / DUR, 0, 1)
const amp = () => Math.hypot(G.th, G.v / W0)
const inWindow = () => { const a = amp(); return a < 0.15 || Math.abs(G.th) >= WIN_K * a }
function ev(e) { if (G.events.length < 500) G.events.push([Math.round(G.t * 10) / 10, e]) }

// かごを押す（タップ）
function push() {
  if (G.mode !== 'play' || G.over) return 'off'
  if (G.busy > 0) return 'busy'
  const a = amp()
  if (inWindow()) {
    // 端で受け止めて押し返す: 位置はそのまま、中心へ向かう速さだけ足す（振れ幅が √(a²+KICK²) になる）
    const dir = a < 0.15 ? (G.th > 0 ? -1 : 1) : -Math.sign(G.th) || 1
    const A2 = Math.hypot(a, KICK)
    G.v = dir * W0 * Math.sqrt(Math.max(0, A2 * A2 - G.th * G.th)); G.good++; ev('push')
    if (G.learn) G.learn.push++
    sfx('creak', { vol: 0.35 })
    if (!SIM) handTo(null)
    return 'ok'
  }
  // 途中で押した: ガタッ
  G.v += (rng() < 0.5 ? 1 : -1) * W0 * 0.14; G.S -= JOLT; G.jolts++; ev('jolt')
  sfx('jolt', { vol: 0.75 }); sfx('creak', { vol: 0.6, rate: 0.8 })
  if (!SIM) { fx.shake(0.02, 0.2); handTo(null) }
  if (G.learn) G.learn.joltT = 2.2
  // 最初のガタッで6割: 赤ちゃんが片目を開けて渋く見る（すぐ寝る）
  if (!G.eyeUsed && G.S > 30) { G.eyeUsed = true; G.eyeT = 1.4; ev('eye'); sfx('j_rare', { vol: 0.35 }) }
  if (G.S <= 0) finish('cry')
  return 'jolt'
}
// 音の出どころをタップ
function tapSrc(src) {
  if (G.mode !== 'play' || G.over) return 'off'
  if (G.busy > 0) return 'busy'
  G.busy = BUSY
  if (!SIM) handTo(src)
  const n = G.noises.find(n => n.src === src && (n.st === 'warn' || n.st === 'on'))
  if (!n) { G.misses++; ev('miss:' + src); return 'miss' }
  const was = n.st
  n.st = 'done'; n.t = 0
  if (was === 'warn') G.prevented++; else G.stopped++
  G.log.push([n.at, n.kind, was === 'warn' ? 'p' : 's'])
  G.post[src] = 2.6; G.postKind = G.postKind || {}; G.postKind[src] = n.kind
  ev((was === 'warn' ? 'prevent:' : 'stop:') + n.kind)
  if (G.learn) G.learn.handled++
  const D = BN.NOISE[n.kind]
  sayAt(src, L(D.done), 'done', 1.6)
  const S2 = { bell: 'paper', dog: 'chew', kid: null, phone: 'paper', gran: 'paper', karaoke: 'knock', sneeze: 'squeak', car: 'window', imo: 'window', clock: null }[n.kind]
  if (S2) sfx(S2, { vol: n.kind === 'karaoke' ? 0.4 : 0.5 })
  if (n.kind === 'karaoke') { if (!SIM) Snd.loop('karaoke', null) }
  if (n.kind === 'car' || n.kind === 'imo') G.winShut = 3.2
  return was === 'warn' ? 'prevent' : 'stop'
}
function spawn(kind) {
  const D = BN.NOISE[kind], p = progress()
  const warn = G.learn && !G.noises.length ? 4.6 : D.warn * lerp(0.95, 0.65, p)
  const n = { kind, src: SRC_OF[kind], st: 'warn', t: 0, warn, len: D.len, at: G.t, tick: 0 }
  G.noises.push(n); ev('spawn:' + kind)
  // 気配の音（小さい）
  if (kind === 'car' || kind === 'imo') sfx('car', { vol: 0.18, dest: 'muf' })
  return n
}
function busySrc(src) { return G.noises.some(n => n.src === src && (n.st === 'warn' || n.st === 'on')) || (G.post[src] || 0) > 0 }
function schedule() {
  const p = progress()
  // 14:00 の鳩時計（決まった時刻）
  if (!G.clockDone && G.t >= 58.5) { G.clockDone = true; if (!busySrc('clock')) spawn('clock') }
  if (G.t < G.next || G.t > DUR - 4) return
  let cands = POOL.filter(k => !busySrc(SRC_OF[k]) && !G.lastKinds.includes(k))
  if (G.learn && !G.noises.length) cands = ['dog']
  if (!cands.length) { G.next = G.t + 1; return }
  let k = cands[Math.floor(rng() * cands.length)]
  if (k === 'car') k = G.carKind
  if (k === 'phone' && G.granLeft > 0 && p > 0.35 && rng() < 0.5) { k = 'gran'; G.granLeft-- }
  spawn(k); G.lastKinds = [k === 'imo' ? 'car' : k === 'gran' ? 'phone' : k, ...G.lastKinds].slice(0, 2)
  // 後半はたまに2つ重なる
  if (p > 0.45 && rng() < lerp(0.2, 0.5, p)) {
    const c2 = POOL.filter(x => !busySrc(SRC_OF[x]) && x !== k && x !== 'car')
    if (c2.length) { const k2 = c2[Math.floor(rng() * c2.length)]; setTimeout0(1.3, () => { if (!G.over && !busySrc(SRC_OF[k2])) spawn(k2) }) }
  }
  G.next = G.t + rnd(lerp(8, 4.2, p), lerp(10, 5.8, p))
}
// sim でも動く「何秒後に」
function setTimeout0(sec, f) { (G.later = G.later || []).push({ at: G.t + sec, f }) }

function stepNoise(n, dt) {
  const D = BN.NOISE[n.kind]
  n.t += dt
  if (n.st === 'warn' && n.t >= n.warn) {
    n.st = 'on'; n.t = 0; n.tick = 0; ev('on:' + n.kind)
    sayAt(n.src, L(D.say), 'loud', Math.min(2.4, Math.max(1.4, D.len)))
    if (D.one) { G.S -= D.one * (G.learn ? 0.5 : 1); if (!SIM) { fx.shake(0.05, 0.35); fx.zoom(0.05, 0.3) } }
    onSound(n, true)
    if (n.kind === 'karaoke' && !SIM) Snd.loop('karaoke', S_('karaoke'), 0.5)
  } else if (n.st === 'on') {
    if (D.drain) G.S -= D.drain * dt * (G.learn ? 0.5 : 1)
    n.tick += dt; onSound(n, false)
    if (n.t >= n.len) { n.st = 'gone'; n.t = 0; G.through++; G.log.push([n.at, n.kind, 't']); ev('through:' + n.kind); if (n.kind === 'karaoke' && !SIM) Snd.loop('karaoke', null) }
  } else if (n.st === 'done' || n.st === 'gone') {
    if (n.t > 3) n.dead = true
  }
}
function onSound(n, first) {
  const every = { bell: 2.3, dog: 1.05, kid: 1.7, phone: 1.25, gran: 2.0, car: 99, imo: 3, karaoke: 99, sneeze: 99, clock: 1.1 }[n.kind]
  if (!first && n.tick < every) return
  n.tick = 0
  const map = { bell: ['bell', 0.8], dog: ['bark', 0.75], kid: ['horn', 0.7], phone: ['buzz', 0.55], gran: ['ring', 0.5], car: ['car', 0.7], imo: ['whistle', 0.35], sneeze: ['sneeze', 1], clock: ['clockbell', 0.6] }[n.kind]
  if (map) sfx(map[0], { vol: map[1] })
  if (first && n.kind === 'phone') sfx('sms', { vol: 0.5 })
  if (first && n.kind === 'imo') sfx('car', { vol: 0.5 })
}

function stepGame(dt) {
  if (G.over) { G.endT += dt; return }
  G.t += dt
  if (G.busy > 0) G.busy -= dt
  for (const k in G.post) if (G.post[k] > 0) G.post[k] -= dt
  if (G.winShut > 0) G.winShut -= dt
  // ふりこ（減衰つき）
  G.v += (-W0 * W0 * G.th - 2 * DAMP * G.v) * dt; G.th += G.v * dt
  const a = amp()
  // 端で「きい」（音だけ。合図には使わない）
  if (!SIM) { const s = Math.sign(G.v); if (G.lastSign && s !== G.lastSign && a > 0.25) sfx('creak', { vol: 0.08 + a * 0.12, rate: 1.1 }); G.lastSign = s }
  // 眠り
  const learnK = G.learn ? 0.5 : 1
  if (a >= OK_LO && a <= OK_HI) G.S += 2.2 * dt
  else if (a < OK_LO) G.S -= (OK_LO - a) / OK_LO * 4.5 * dt * learnK
  else { G.S -= (4 + (a - OK_HI) / 0.18 * 12) * dt * learnK; G.strongT += dt }
  for (const n of G.noises) stepNoise(n, dt)
  G.noises = G.noises.filter(n => !n.dead)
  if (G.later) { for (const l of G.later) if (G.t >= l.at && !l.done) { l.done = true; l.f() } G.later = G.later.filter(l => !l.done) }
  schedule()
  G.S = Math.min(100, G.S)
  G.sumS += Math.max(0, G.S) * dt
  if (Math.floor(G.t) > G.hist.length - 1) G.hist.push(Math.round(Math.max(0, G.S)))
  if (G.eyeT > 0) G.eyeT -= dt
  if (G.S <= 0) { finish('cry'); return }
  // ぐずり声・寝言（見た目と小ネタ）
  if (G.S < 35 && G.t >= G.fussAt) { sfx('fuss', { vol: 0.35 }); G.fussAt = G.t + rnd(2.2, 3.2) }
  if (G.t >= G.talkAt && G.S > 60) { sayAt('baby', L(BN.SLEEPTALK[Math.floor(rng() * BN.SLEEPTALK.length)]), 'baby', 1.6); G.talkAt = G.t + rnd(28, 40) }
  if (G.t >= G.papaTalkAt) { if (!busySrc('papa')) sayAt('papa', L(BN.PAPATALK[Math.floor(rng() * BN.PAPATALK.length)]), '', 1.8); G.papaTalkAt = G.t + rnd(40, 55) }
  if (G.learn) learnStep(dt)
  if (G.t >= DUR) finish('win')
}
function finish(kind) {
  if (G.over) return
  G.over = kind; G.endT = 0; ev('end:' + kind)
  for (const n of G.noises) if (n.st === 'warn' || n.st === 'on') n.st = 'gone'
  if (!SIM) { Snd.loop('karaoke', null); Snd.loop('bgm', null, 0, 0.2) }
  if (kind === 'cry') { G.S = 0; sfx('wail', { vol: 1 }); if (!SIM) { fx.shake(0.07, 0.6); cutin('c_wail') } }
  else { sfx('coo', { vol: 0.7 }); sfx('j_win', { vol: 0.6 }); sayAt('baby', L(BN.WIN[0]), 'baby', 2.4) }
  unsay('hint')
}
function result() {
  const ko = G.over === 'cry', sec = Math.round(G.t)
  const mean = G.t > 0 ? G.sumS / G.t : 0
  const points = ko ? Math.round(Math.min(39, G.t / 3)) : Math.round(clamp(mean, 0, 100))
  const title = ko ? L(BN.KO_TITLES.find(r => sec >= r.sec).t) : L(BN.TITLES.find(r => points >= r.min).t)
  return { ko, sec, points, title, mean: Math.round(mean), prevented: G.prevented, stopped: G.stopped, through: G.through, jolts: G.jolts, good: G.good, line: G.line }
}

// ============================================================ 初めての1回: 遊びの中で、その時に合わせて教える（止まって待たない）
function learnStep(dt) {
  const l = G.learn
  if (l.joltT > 0) l.joltT -= dt
  if ((l.push >= 3 && l.handled >= 1) || G.t > 42) { G.learn = null; store.set(TUT_KEY, '1'); unsay('hint'); return }
  const live = G.noises.find(n => n.st === 'warn' || n.st === 'on')
  if (live && l.handled < 1) hint('noise', live.src)
  else if (l.joltT > 0) hint('jolt')
  else if (amp() > OK_HI) hint('strong')
  else if (l.push < 3) hint('push')
  else unsay('hint')
}
function hint(k, src) {
  if (SIM) return
  const l = G.learn; l.src = src
  if (l.shown === k && G.texts.hint) return
  l.shown = k
  say('hint', L(BN.HINT[k]), '', 30)
}

// ============================================================ 文字（同時に2つまで: 教える一文＋吹き出し1つ）
function say(slot, text, cls = '', sec) { if (SIM) return; G.texts[slot] = { text, cls, until: G.clock + (sec || Math.max(1.4, 0.9 + text.length * 0.09)), born: G.clock, at: null } }
function sayAt(at, text, cls = '', sec) { if (SIM) return; G.texts.bubble = { text, cls, until: G.clock + (sec || Math.max(1.2, 0.9 + text.length * 0.09)), born: G.clock, at } }
function unsay(slot) { G.texts[slot] = null }

// ============================================================ 画面（DOM）
const VIEWS = ['vTitle', 'vHow', 'vPlay', 'vResult']
function show(id) { for (const v of VIEWS) $(v).hidden = v !== id; $('bMute').hidden = id === 'vResult' }
const v3 = new THREE.Vector3()
function toScreen(p) { v3.copy(p).project(camera); return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight } }
function srcXY(src) { return src === 'baby' ? babyXY() : toScreen(SRC[src]) }
function babyXY() { const p = new THREE.Vector3(0, 0.3, 0); baby.localToWorld(p.set(-0.1, 0.75, 0)); return toScreen(p) }
function cradleRect() {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
  for (const px of [-0.62, 0.62]) for (const py of [0.24, 0.7]) { const s = toScreen(new THREE.Vector3(px, py, PIVOT.z)); x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y) }
  return { x0: Math.max(0, x0), y0: Math.max(0, y0 - 10), x1: Math.min(innerWidth, x1), y1: innerHeight }
}
function hitSrc(x, y) {
  let best = null, bd = 1e9; const r = Math.max(54, innerWidth * 0.15)
  for (const s in SRC) { if (s === 'kid' && !kid.visible) continue; const p = srcXY(s), d = Math.hypot(p.x - x, p.y - y); if (d < r && d < bd) { bd = d; best = s } }
  return best
}
function clockDom() {
  const k = clamp(G.t / DUR, 0, 1), mins = 13 * 60 + k * 120
  const key = Math.floor(mins); const el = $('hHour'); if (el.dataset.k == key) return; el.dataset.k = key
  const ha = ((mins / 60) % 12) / 12 * Math.PI * 2, ma = (mins % 60) / 60 * Math.PI * 2
  el.setAttribute('x2', 40 + Math.sin(ha) * 18); el.setAttribute('y2', 40 - Math.cos(ha) * 18)
  $('hMin').setAttribute('x2', 40 + Math.sin(ma) * 27); $('hMin').setAttribute('y2', 40 - Math.cos(ma) * 27)
  // 13時から15時の扇（残り）
  const a0 = ((mins / 60) % 12) / 12 * Math.PI * 2, a1 = 3 / 12 * Math.PI * 2, r = 31
  const p = (a) => (40 + Math.sin(a) * r).toFixed(1) + ' ' + (40 - Math.cos(a) * r).toFixed(1)
  $('clockArc').setAttribute('d', a1 - a0 > 0.01 ? `M40 40L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z` : '')
}
function marksDom() {
  const box = $('marks'), live = G.mode === 'play' && !G.over ? G.noises.filter(n => n.st === 'warn' || n.st === 'on') : []
  while (box.children.length < live.length) box.appendChild(document.createElement('i'))
  ;[...box.children].forEach((i, k) => {
    const n = live[k]; if (!n) { i.hidden = true; return }
    i.hidden = false; const p = srcXY(n.src); i.style.left = p.x + 'px'; i.style.top = p.y + 'px'; i.classList.toggle('on', n.st === 'on'); i.dataset.src = n.src
  })
}
function textsDom() {
  const now = G.clock
  for (const k in G.texts) { const v = G.texts[k]; if (v && now > v.until) G.texts[k] = null }
  for (const k of ['bubble', 'hint']) {
    const v = G.texts[k], e = $(k)
    if (!v) { if (!e.hidden) e.hidden = true; continue }
    if (e.dataset.t !== v.text || e.hidden) { e.dataset.t = v.text; e.textContent = v.text; e.className = (k === 'hint' ? 'hint ' : 'bubble ') + v.cls; e.hidden = false }
  }
  const v = G.texts.bubble; if (!v) return
  const e = $('bubble'), p = srcXY(v.at), W = innerWidth, H = innerHeight, w = e.offsetWidth, h = e.offsetHeight
  const left = clamp(p.x - w / 2, 8, W - w - 8), top = clamp(p.y - h - 40, 84, H - h - 16)
  e.style.left = Math.round(left) + 'px'; e.style.top = Math.round(top) + 'px'
  e.style.setProperty('--tail', clamp(p.x - left, 16, w - 16) + 'px')
}
let cradleR = null
function cradleDom() {
  const r = cradleR = cradleRect(), e = $('cradleHit')
  e.style.left = r.x0 + 'px'; e.style.top = r.y0 + 'px'; e.style.width = (r.x1 - r.x0) + 'px'; e.style.height = (r.y1 - r.y0) + 'px'
}
// 手は1本: 押した所へ手が行って戻る
let handAnim = null
function handTo(src) {
  const r = cradleR || cradleRect(), from = { x: (r.x0 + r.x1) / 2 + 40, y: r.y1 - 60 }
  const to = src ? srcXY(src) : toScreen(new THREE.Vector3(G.th > 0 ? 0.3 : -0.3, 0.5, PIVOT.z + 0.15))
  handAnim = { from, to, t: 0, d: src ? BUSY : 0.25 }
}
function handDom(dt) {
  const h = $('hand')
  if (!handAnim) { h.style.opacity = 0; return }
  handAnim.t += dt; const k = handAnim.t / handAnim.d
  if (k >= 1) { handAnim = null; h.style.opacity = 0; return }
  const q = k < 0.5 ? ease(k * 2) : 1 - ease((k - 0.5) * 2) * 0.0
  const x = lerp(handAnim.from.x, handAnim.to.x, Math.min(1, k * 2)), y = lerp(handAnim.from.y, handAnim.to.y, Math.min(1, k * 2))
  h.style.opacity = k < 0.8 ? 1 : (1 - k) * 5; h.style.transform = `translate(${x}px,${y}px) scale(${1 + 0.15 * Math.sin(q * Math.PI)})`
}
// 初めての1回の指
function fingerDom() {
  let f = $('finger')
  const l = G.mode === 'play' && G.learn && G.texts.hint ? G.learn.shown : null
  if (!l || (l !== 'push' && l !== 'noise' && l !== 'jolt')) { if (f) f.hidden = true; return }
  if (!f) { f = document.createElement('div'); f.id = 'finger'; f.className = 'finger'; f.innerHTML = '<svg viewBox="0 0 44 44"><path d="M16 4c2 0 4 2 4 4v12l2-1c2-1 4 0 5 1l6 3c2 1 3 3 3 5l-2 10H14L8 28c-1-2 0-4 2-4s3 1 4 2V8c0-2 0-4 2-4z" fill="#fff" stroke="#222" stroke-width="2.5"/></svg>'; document.body.append(f) }
  let p
  if (l === 'noise' && G.learn.src) p = srcXY(G.learn.src)
  else { if (!inWindow()) { f.hidden = true; return } p = toScreen(new THREE.Vector3(G.th > 0 ? 0.25 : -0.25, 0.42, PIVOT.z + 0.1)) }
  f.hidden = false
  const k = (G.clock % 0.7) / 0.7
  f.style.left = p.x + 'px'; f.style.top = (p.y + (k < 0.5 ? k * 14 : (1 - k) * 14)) + 'px'
}
function cutin(img, hold) {
  if (SIM) return
  const c = $('cutin'); c.querySelector('img').src = 'img/' + img + '.webp'
  c.classList.remove('on', 'hold'); void c.offsetWidth; c.classList.add(hold ? 'hold' : 'on')
}

// ---- 指の操作: かご＝押す、それ以外＝音の出どころ
const cradleHit = $('cradleHit')
cradleHit.addEventListener('pointerdown', e => { if (G.mode !== 'play' || G.over) return; e.preventDefault(); firstTouch(); push() })
canvas.addEventListener('pointerdown', e => {
  if (G.mode !== 'play' || G.over) return
  e.preventDefault(); firstTouch()
  const s = hitSrc(e.clientX, e.clientY); if (s) tapSrc(s)
})

// ============================================================ 毎フレームの見た目
const doorDraw = () => {
  const x = doorC.getContext('2d'), W = 128, H = 256
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f4f2ea'); g.addColorStop(1, '#dcd8cc'); x.fillStyle = g; x.fillRect(0, 0, W, H)
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect((i * 37) % W, (i * 53) % H, 3, 3) }
  const n = G.noises && G.noises.find(n => n.kind === 'bell' && (n.st === 'warn' || n.st === 'on'))
  const done = G.post.door > 0 && G.postKind && G.postKind.door === 'bell'
  if (n || done) {
    const k = n ? (n.st === 'warn' ? ease(n.t / n.warn) : 1) : clamp(G.post.door / 2.6, 0, 1)
    x.fillStyle = `rgba(40,50,80,${0.15 + 0.5 * k})`
    const cx = 64 + (done ? (1 - k) * 40 : 0)
    x.beginPath(); x.ellipse(cx, 70, 24, 26, 0, 0, 7); x.fill()
    x.beginPath(); x.ellipse(cx, 40, 30, 12, 0, 0, 7); x.fill()     // 帽子
    x.fillRect(cx - 34, 96, 68, 160)
    x.fillStyle = `rgba(120,90,50,${0.2 + 0.5 * k})`; x.fillRect(cx - 40, 130, 56, 44)   // 箱
  }
  x.strokeStyle = '#6d5238'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6)
  doorT.needsUpdate = true
}
const phoneDraw = (mode) => {
  const x = phoneC.getContext('2d'), W = 64, H = 128
  if (phoneDraw.k === mode) return; phoneDraw.k = mode
  x.fillStyle = '#0d0d12'; x.fillRect(0, 0, W, H)
  if (mode === 'msg') { x.fillStyle = '#e8f0fb'; x.fillRect(2, 2, W - 4, H - 4); x.fillStyle = '#5fbf6a'; for (let i = 0; i < 5; i++) x.fillRect(6, 10 + i * 22, 44, 14); x.fillStyle = '#d83b3b'; x.beginPath(); x.arc(54, 10, 8, 0, 7); x.fill() }
  else if (mode === 'call') { x.fillStyle = '#2e7d4f'; x.fillRect(2, 2, W - 4, H - 4); x.fillStyle = '#f2d6bc'; x.beginPath(); x.arc(32, 46, 16, 0, 7); x.fill(); x.fillStyle = '#d8d8d8'; x.beginPath(); x.arc(32, 38, 15, Math.PI, 0); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(18, 104, 8, 0, 7); x.fill(); x.fillStyle = '#d83b3b'; x.beginPath(); x.arc(46, 104, 8, 0, 7); x.fill() }
  else if (mode === 'down') { x.fillStyle = '#26262c'; x.fillRect(0, 0, W, H); x.fillStyle = '#4a4a52'; x.beginPath(); x.arc(14, 14, 6, 0, 7); x.fill() }
  phoneT.needsUpdate = true
}
function castLook() {
  const live = k => G.mode === 'play' && G.noises ? G.noises.find(n => n.kind === k && (n.st === 'warn' || n.st === 'on')) : null
  const post = (src, kind) => G.post && G.post[src] > 0 && G.postKind && G.postKind[src] === kind
  const jit = a => (Math.random() - 0.5) * a
  // 犬
  const nd = live('dog')
  setPaper(dog, nd ? (nd.st === 'on' ? 'd_bark' : 'd_alert') : post('dog', 'dog') ? 'd_chew' : 'd_sleep', nd ? 0.36 : 0.3)
  dog.position.x = -0.5 + (nd && nd.st === 'on' ? jit(0.02) : 0)
  // 上の子: 廊下から忍び足で来て、ラッパ
  const nk = live('kid'), pk = post('kid', 'kid')
  kid.visible = !!(nk || pk)
  if (nk) { setPaper(kid, 'k_horn', 0.78); const k = nk.st === 'warn' ? ease(nk.t / nk.warn) : 1; kid.position.set(-0.72, 0, lerp(-2.6, -1.78, k)); kid.scale.y *= nk.st === 'on' ? 1 + Math.abs(Math.sin(G.clock * 18)) * 0.04 : 1 }
  else if (pk) { setPaper(kid, 'k_shh', 0.78); const k = 1 - G.post.kid / 2.6; kid.position.set(-0.72, 0, lerp(-1.78, -2.7, ease(k))) }
  // パパ
  const ns = live('sneeze')
  setPaper(papa, ns ? (ns.st === 'warn' ? 'p_sneeze' : 'p_nap') : post('papa', 'sneeze') ? 'p_pinch' : 'p_nap')
  papa.position.y = 0.27 + (ns && ns.st === 'warn' ? Math.abs(Math.sin(G.clock * 9)) * 0.012 * (ns.t / ns.warn) : 0)
  // スマホ
  const np = live('phone') || live('gran')
  phoneDraw(np ? (np.kind === 'gran' ? 'call' : 'msg') : (post('phone', 'phone') || post('phone', 'gran')) ? 'down' : 'off')
  phone.position.x = 0.56 + (np ? jit(np.st === 'on' ? 0.012 : 0.004) : 0)
  phone.rotation.y = np ? jit(0.1) : 0
  // 額（隣のカラオケ）
  const nr = live('karaoke')
  frame.rotation.z = nr ? Math.sin(G.clock * (nr.st === 'on' ? 26 : 9)) * (nr.st === 'on' ? 0.06 : 0.02) : 0
  // 窓の外の車
  for (const [m, kind] of [[car, 'car'], [imo, 'imo']]) {
    const nc = live(kind), pc = post('window', kind)
    m.visible = !!(nc || pc)
    if (nc) { const k = nc.st === 'warn' ? nc.t / nc.warn : 1 + nc.t / nc.len * 0.6; m.position.set(lerp(-0.9, 0.5, Math.min(k, 1)) + Math.max(0, k - 1) * 0.6, 0.76, -3.5) }
    else if (pc) { m.position.x += 0.004 }
  }
  // 窓を閉める
  sash.position.x = lerp(sash.position.x, G.winShut > 0 ? 0.35 : 0.75, 0.2)
  // 鳩時計
  const nq = live('clock'), pq = post('clock', 'clock')
  cuckoo.visible = !!(nq && (nq.st === 'on' || nq.t > nq.warn * 0.6)) || pq
  clockDoor.rotation.y = nq ? (nq.st === 'on' ? -1.6 : Math.sin(G.clock * 20) * 0.15 * nq.t / nq.warn) : pq ? -1.2 : 0
  if (cuckoo.visible) { const out = nq && nq.st === 'on' ? 0.16 : pq ? 0.07 : 0.04; cuckoo.position.set(-0.17, 1.56 + (nq && nq.st === 'on' ? Math.abs(Math.sin(G.clock * 12)) * 0.02 : 0), R.z0 + 0.05 + out); cuckoo.rotation.z = pq ? 0.3 : 0 }
  // 時計の針
  const mins = 13 * 60 + clamp(G.t / DUR, 0, 1) * 120
  clockHand.rotation.z = -(mins % 60) / 60 * Math.PI * 2; clockHand.position.set(Math.sin((mins % 60) / 60 * Math.PI * 2) * 0.025, -0.04 + Math.cos((mins % 60) / 60 * Math.PI * 2) * 0.025, 0.052)
  doorDraw()
}
function babyLook(dt) {
  let name = 'b_deep'
  const S = G.mode === 'play' || G.mode === 'result' ? G.S : 80
  if (G.over === 'cry') name = 'b_wail'
  else if (G.over === 'win') name = 'b_wake'
  else if (G.eyeT > 0) name = 'b_eye'
  else if (G.mode !== 'play') name = 'b_deep'
  else if (S < 35) name = 'b_fuss'
  else if (S < 60 || amp() > OK_HI) name = 'b_light'
  setPaper(baby, name, 0.36)
  baby.position.set(0, 0, 0)
  if (name === 'b_fuss' || name === 'b_wail') baby.position.x = (Math.random() - 0.5) * (name === 'b_wail' ? 0.02 : 0.006)
  // 鼻ちょうちん: 眠りが深いほど大きい。寝息でふくらむ。38を切ったら割れる
  const nose = NOSE[name]
  if (G.mode === 'play' && !G.over) {
    if (G.bubbleOn && S < 38) { G.bubbleOn = false; G.popAt = G.clock; sfx('pop', { vol: 0.5 }) }
    else if (!G.bubbleOn && S > 46) G.bubbleOn = true
  } else G.bubbleOn = G.mode !== 'play' || !G.over
  G.popT = G.popAt != null ? Math.max(0, 0.25 - (G.clock - G.popAt)) : 0
  const on = G.bubbleOn && nose && G.over !== 'cry' && G.over !== 'win'
  noseBubble.visible = on || G.popT > 0
  if (noseBubble.visible) {
    const img = TEX[name] && TEX[name].image, asp = img && img.width ? img.width / img.height : 1.1, w = 0.36 * asp, n = nose || NOSE.b_deep
    const base = G.popT > 0 ? 0.05 * (1 + (0.25 - G.popT) * 6) : 0.016 + 0.048 * clamp((S - 38) / 62, 0, 1)
    const breath = G.popT > 0 ? 1 : 1 + 0.28 * Math.sin(G.clock * Math.PI * 2 / 2.6)
    const r = base * breath
    noseBubble.scale.set(r, r, r * 0.8); noseBubble.position.set((n[0] - 0.5) * w + r * 1.15, n[1] * 0.36 + r * 0.5, 0.03)
    bubbleMat.opacity = G.popT > 0 ? G.popT * 2 : 0.78
  }
}
function swingLook() {
  swing.rotation.z = G.th * MAXANG
  // 押せる瞬間だけ縁がほんのり光る（実際に端にいる間だけ）
  const on = G.mode === 'play' && !G.over && amp() >= 0.15 && inWindow()
  rimMat.emissiveIntensity = lerp(rimMat.emissiveIntensity, on ? 0.55 : 0, 0.35)
}

// ============================================================ 遊びの開始・終わり
function firstTouch() {
  Snd.init()
  if (!Snd.loops.amb && !SIM) { Snd.loop('amb', S_('amb_birds'), 0.12); Snd.loop('tick', S_('amb_tick'), 0.1); Snd.loop('bgm', S_('bgm_box'), 0.22) }
}
let resultShown = false
function startPlay(learn = false) {
  const seed = params.has('seed') ? +params.get('seed') : (Date.now() % 100000) + G.playNo * 7
  G.texts = { bubble: null, hint: null }; resultShown = false
  newGame(seed, learn); G.mode = 'play'
  $('gekiga').hidden = true; $('gekiga').classList.remove('out'); $('gekigaLine').classList.remove('on')
  $('cutin').classList.remove('on', 'hold')
  if (window.TM) TM.start()
  show('vPlay')
  if (!Snd.loops.bgm && !SIM && Snd.ctx) Snd.loop('bgm', S_('bgm_box'), 0.22)
}
function begin() {
  firstTouch(); sfx('click', { vol: 0.6 }); G.playNo++
  startPlay(!store.get(TUT_KEY) && !params.has('notut'))
}
// 終わりの演出: 大泣き、泣き止んで渋い顔で銃を構える、一言、暗転
function stepEnd() {
  if (!G.over || G.mode !== 'play') return
  const t = G.endT
  if (G.over === 'cry') {
    if (t > 0.5 && !G.wail2) { G.wail2 = true; sfx('wail', { vol: 1 }) }
    if (t > 1.5 && !G.gek) {
      G.gek = true; G.line = L(BN.GEKIGA[Math.floor(rng() * BN.GEKIGA.length)])
      if (!SIM) {
        Snd.duck(0.0, 3.5); $('cutin').classList.remove('on', 'hold')
        const g = $('gekiga'); $('gekigaImg').src = 'img/g_aim.webp'; $('gekigaLine').textContent = G.line.length > 9 ? G.line.replace(/([。、.,])(?=.)/, '$1\n') : G.line; g.hidden = false
      }
    }
    if (t > 1.75 && !G.cock) { G.cock = true; sfx('cock', { vol: 0.9 }) }
    if (t > 2.15 && !G.lineOn) { G.lineOn = true; if (!SIM) { $('gekigaLine').classList.add('on'); sfx('j_gekiga', { vol: 0.6 }) } }
    if (t > 4.3 && !G.blk) { G.blk = true; if (!SIM) $('gekiga').classList.add('out') }
    if (t > 5.3 && !resultShown) { resultShown = true; showResult() }
  } else if (t > 2.8 && !resultShown) { resultShown = true; showResult() }
}
async function showResult() {
  const r = result()
  G.mode = 'result'; show('vResult')
  if (window.TM) TM.end(r.points, !r.ko)
  await drawCard(r)
  fitCard()
  $('gekiga').hidden = true
  const text = r.ko
    ? (lang === 'en' ? `Woke the baby at ${clockStr(r.sec)}. "${r.line}" #NapDefense` : `${clockStr(r.sec)}、赤ちゃんを起こした。「${r.line}」 #寝かしつけ防衛戦`)
    : (lang === 'en' ? `Kept the baby asleep till 3 PM. Sleep score ${r.points}. "${r.title}" #NapDefense` : `15時まで寝かせきった。眠りの深さ${r.points}点「${r.title}」 #寝かしつけ防衛戦`)
  $('bPost').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.com/play/baby-nap-guard/')
  window.__lastResult = r
}
const clockStr = sec => { const m = 13 * 60 + Math.round(sec); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') }
function fitCard() {
  const box = $('cardBox'), c = $('card'), bw = box.clientWidth, bh = box.clientHeight
  const s = Math.min(bw / 720, bh / 1000); c.style.width = Math.floor(720 * s) + 'px'; c.style.height = Math.floor(1000 * s) + 'px'
}
addEventListener('resize', () => { if (!$('vResult').hidden) fitCard() })
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src }) }
// 結果: 育児日記の1ページ（眠りの線・邪魔者の印・写真・ひとこと）
async function drawCard(r) {
  const c = $('card'), x = c.getContext('2d'), W = 720, H = 1000
  try { await Promise.all([document.fonts.load('40px "Klee One"'), document.fonts.load('800 40px "Shippori Mincho B1"')]) } catch (e) {}
  const pen = '"Klee One", "Hiragino Maru Gothic ProN", sans-serif', min = '"Shippori Mincho B1", "Hiragino Mincho ProN", serif'
  x.fillStyle = '#fffdf6'; x.fillRect(0, 0, W, H)
  x.strokeStyle = 'rgba(63,108,156,.18)'; x.lineWidth = 1.5; for (let y = 120; y < H; y += 40) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke() }
  x.strokeStyle = 'rgba(217,96,126,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(56, 0); x.lineTo(56, H); x.stroke()
  const d = new Date()
  x.fillStyle = '#2b2620'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'
  x.font = `600 40px ${pen}`; x.fillText(lang === 'en' ? 'Baby log' : '育児日記', 76, 70)
  x.font = `600 26px ${pen}`; x.fillText((lang === 'en' ? `${d.getMonth() + 1}/${d.getDate()}  nap ` : `${d.getMonth() + 1}月${d.getDate()}日　お昼寝 `) + '13:00 - ' + clockStr(r.ko ? r.sec : DUR), 250, 68)
  // 眠りの線（13:00〜15:00）
  const gx = 90, gw = 580, gy = 150, gh = 150
  x.strokeStyle = 'rgba(43,38,32,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(gx, gy + gh); x.lineTo(gx + gw, gy + gh); x.stroke()
  x.font = `600 20px ${pen}`; x.fillStyle = '#5a4c3a'; x.textAlign = 'center'
  for (const [k, s] of [[0, '13:00'], [0.5, '14:00'], [1, '15:00']]) { x.fillText(s, gx + gw * k, gy + gh + 28); x.beginPath(); x.moveTo(gx + gw * k, gy + gh - 6); x.lineTo(gx + gw * k, gy + gh + 4); x.stroke() }
  x.textAlign = 'left'; x.fillText(lang === 'en' ? 'deep' : 'ぐっすり', gx - 4, gy - 8)
  const hs = G.hist.length ? G.hist : [72]
  x.strokeStyle = '#3f6c9c'; x.lineWidth = 4; x.lineJoin = 'round'; x.beginPath()
  hs.forEach((v, i) => { const px = gx + gw * (i / DUR), py = gy + gh - gh * v / 100; i ? x.lineTo(px, py) : x.moveTo(px, py) })
  const endX = gx + gw * Math.min(1, r.sec / DUR); x.lineTo(endX, gy + gh - gh * (r.ko ? 0 : hs[hs.length - 1]) / 100); x.stroke()
  // 邪魔者の印（止めた=丸、止めきれず=三角、鳴りきった=×）
  for (const [t, kind, res] of G.log) {
    const px = gx + gw * (t / DUR), py = gy + gh + 44
    x.strokeStyle = res === 't' ? '#b0402c' : '#3f6c9c'; x.lineWidth = 3; x.beginPath()
    if (res === 'p') x.arc(px, py, 7, 0, 7); else if (res === 's') { x.moveTo(px, py - 8); x.lineTo(px + 8, py + 6); x.lineTo(px - 8, py + 6); x.closePath() } else { x.moveTo(px - 7, py - 7); x.lineTo(px + 7, py + 7); x.moveTo(px + 7, py - 7); x.lineTo(px - 7, py + 7) }
    x.stroke()
  }
  if (r.ko) { x.fillStyle = '#b0402c'; x.font = `600 28px ${pen}`; x.textAlign = 'center'; x.textAlign = 'right'; x.fillText(lang === 'en' ? 'WAAAH' : 'ギャン泣き', gx + gw, gy - 8) }
  // 写真（マスキングテープ留め）
  const ph = await loadImg('img/' + (r.ko ? 'g_aim' : 'b_wake') + '.webp')
  const px0 = r.ko ? 150 : 200, py0 = 384, pw = r.ko ? 420 : 320, phh = r.ko ? 430 : 300
  x.save(); x.translate(px0 + pw / 2, py0 + phh / 2); x.rotate(r.ko ? -0.025 : 0.03)
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(-pw / 2 + 6, -phh / 2 + 8, pw, phh)
  x.fillStyle = r.ko ? '#e9e2d2' : '#fff'; x.fillRect(-pw / 2, -phh / 2, pw, phh)
  if (r.ko) { x.save(); x.beginPath(); x.rect(-pw / 2 + 12, -phh / 2 + 12, pw - 24, phh - 24); x.clip(); x.fillStyle = '#111'; for (let a = 0; a < Math.PI * 2; a += 0.07) { x.beginPath(); x.moveTo(0, -20); x.lineTo(Math.cos(a) * 600, Math.sin(a) * 600 - 20); x.lineTo(Math.cos(a + 0.02) * 600, Math.sin(a + 0.02) * 600 - 20); x.fill() } x.restore() }
  else { x.fillStyle = '#f3e7cf'; x.fillRect(-pw / 2 + 12, -phh / 2 + 12, pw - 24, phh - 24) }
  if (ph) { const h = phh - 30, w = Math.min(pw - 24, ph.width / ph.height * h); x.drawImage(ph, -w / 2, -phh / 2 + 16, w, w / (ph.width / ph.height)) }
  x.fillStyle = 'rgba(233,165,182,.75)'; x.fillRect(-60, -phh / 2 - 14, 120, 30)
  x.restore()
  // ひとこと（銃のときは劇画の字）
  x.textAlign = 'center'
  if (r.ko) {
    x.font = `800 40px ${min}`; let fs = 40; while (x.measureText(r.line).width > 600 && fs > 26) { fs -= 2; x.font = `800 ${fs}px ${min}` }
    x.fillStyle = '#111'; x.fillText(r.line, W / 2, 846)
  } else {
    x.font = `600 34px ${pen}`; x.fillStyle = '#2b2620'; x.fillText(lang === 'en' ? 'Slept until 3 PM.' : '15時まで、ぐっすり。', W / 2, 712)
  }
  // 称号と点
  x.font = `600 ${r.ko ? 32 : 46}px ${pen}`; x.fillStyle = r.ko ? '#5a4c3a' : '#b03c5a'
  x.fillText(r.title, W / 2, r.ko ? 900 : 790)
  if (!r.ko) { x.font = `600 30px ${pen}`; x.fillStyle = '#2b2620'; x.fillText((lang === 'en' ? 'Sleep score ' : '眠りの深さ ') + r.points, W / 2, 846) }
  const line = lang === 'en' ? `Stopped early ${r.prevented} / Stopped late ${r.stopped} / Let through ${r.through} / Jolts ${r.jolts}` : `鳴る前に止めた ${r.prevented}　鳴ってから ${r.stopped}　鳴りきった ${r.through}　ガタッ ${r.jolts}`
  x.font = `600 25px ${pen}`; x.fillStyle = '#5a4c3a'; let ls = 25; while (x.measureText(line).width > 640 && ls > 14) { ls--; x.font = `600 ${ls}px ${pen}` } x.fillText(line, W / 2, 950)
  x.font = `600 22px ${pen}`; x.fillStyle = 'rgba(60,50,40,.6)'; x.textAlign = 'right'; x.fillText(lang === 'en' ? 'Nap Defense' : '寝かしつけ防衛戦', W - 20, 985)
}

// ============================================================ ボタン
function applyLang() {
  document.documentElement.lang = lang
  $('t1').textContent = T('title1'); $('t2').textContent = T('title2'); $('tSub').textContent = T('sub')
  $('bStart').textContent = T('start'); $('bHow').textContent = T('how'); $('bLang').textContent = T('lang')
  $('howH').textContent = T('how'); $('howWarn').textContent = L(BN.HOWTO.warn); $('bHowClose').textContent = T('close'); $('lPrivacy').textContent = T('privacy')
  $('howCredit').textContent = lang === 'en' ? 'Sounds: Jhang Y & Oller D (CC BY 4.0), Kenney, Commons and OpenGameArt contributors (CC0/PD)' : '音: Jhang Y・Oller D（CC BY 4.0）ほか CC0 と パブリックドメインの録音'
  const ruleImg = ['img/b_deep.webp', 'img/d_alert.webp', 'img/b_fuss.webp']
  $('howRules').innerHTML = ''
  BN.HOWTO.rules.forEach(([a, b], i) => {
    const li = document.createElement('li')
    const pic = Object.assign(document.createElement('img'), { src: ruleImg[i], alt: '' })
    const t = document.createElement('div'); t.innerHTML = '<b></b><span></span>'; t.querySelector('b').textContent = L(a); t.querySelector('span').textContent = L(b)
    li.append(pic, t); $('howRules').append(li)
  })
  $('bAgain').textContent = T('again'); $('bSave').textContent = T('save'); $('bPost').textContent = T('post');
}
$('bStart').onclick = begin
$('bAgain').onclick = begin
$('bHow').onclick = () => { firstTouch(); show('vHow') }
$('bHowClose').onclick = () => show('vTitle')
$('bLang').onclick = () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('bn_lang', lang); applyLang() }
$('bMute').onclick = () => { muted = !muted; store.set('bn_mute', muted ? '1' : '0'); Snd.setMute(muted); $('bMute').classList.toggle('off', muted) }
$('bMute').classList.toggle('off', muted)
$('bSave').onclick = () => { if (window.TM) TM.share('save'); $('card').toBlob(b => { if (!b) return; const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'baby-nap-guard.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000) }) }
$('bPost').onclick = () => { if (window.TM) TM.share('x') }

// ============================================================ ループ
const STEP = 1 / 60
let last = performance.now(), acc = 0
function logic(dt) {
  G.clock += dt
  if (G.mode === 'play') {
    if (G.bot && !SIM && !G.over) G.bot(api, G.botSt || (G.botSt = { r: mulberry(5) }), dt)
    stepGame(dt); stepEnd()
  } else if (G.mode === 'title' || G.mode === 'boot') {
    // タイトルの裏でも、かごはゆっくり揺れている
    G.th = Math.sin(G.clock * W0) * 0.45; G.v = 0
  }
}
function render(dtR) {
  const vdt = fx.update(dtR)
  swingLook(); babyLook(vdt); castLook()
  for (const m of PAPERS) { if (!m.visible || !m.userData.face) continue; m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z) }
  babyPivot.rotation.x = -0.62
  camera.position.copy(CAM.p); camera.lookAt(CAM.t)
  curtL.rotation.y = Math.sin(G.clock * 0.8) * 0.06; curtR.rotation.y = -Math.sin(G.clock * 0.7 + 1) * 0.06
  look.update(); fx.applyCamera()
  renderer.render(scene, camera)
  if (G.mode === 'play') { cradleDom(); textsDom(); clockDom(); marksDom(); handDom(dtR); fingerDom() }
  else { for (const k of ['bubble', 'hint']) $(k).hidden = true; $('marks').innerHTML = ''; fingerDom(); handDom(dtR) }
}
function loop(now) {
  requestAnimationFrame(loop)
  let dt = (now - last) / 1000; last = now
  if (dt > 0.25) dt = 0.25
  if (!G.paused) { acc += dt * (G.speed || 1); let n = 0; while (acc >= STEP && n < 240) { logic(STEP); acc -= STEP; n++ } }
  render(G.paused ? 0 : dt)
}

// ============================================================ 検証用の窓口と bot
const api = {
  get state() { return { mode: G.mode, t: G.t, S: G.S, th: G.th, v: G.v, amp: amp(), win: inWindow(), busy: G.busy, over: G.over, noises: (G.noises || []).map(n => ({ kind: n.kind, src: n.src, st: n.st, t: n.t, warn: n.warn, at: n.at })), good: G.good, jolts: G.jolts, prevented: G.prevented, stopped: G.stopped, through: G.through, learn: G.learn && { ...G.learn }, eyeT: G.eyeT, bubble: G.bubbleOn, face: baby.userData.tex } },
  push, tapSrc, result, srcXY, SRC: Object.keys(SRC),
  cradleXY() { const r = cradleRect(); return { x: (r.x0 + r.x1) / 2, y: (r.y0 + Math.min(r.y1, r.y0 + 200)) / 2 + 20 } },
  texts: () => Object.values(G.texts).filter(Boolean).map(v => v.text),
  events: () => G.events.slice(),
  sim(botName, seed, o = {}) {
    SIM = true; const keepMode = G.mode
    newGame(seed); G.mode = 'play'
    const bot = BOTS[botName], st = { r: mulberry(seed * 13 + 3), ...o }
    let n = 0
    const trace = []
    while (!G.over && n < 60 * 200) { bot(api, st, STEP); stepGame(STEP); n++; if (o.trace && n % 30 === 0) trace.push([Math.round(G.t * 10) / 10, Math.round(G.S), Math.round(amp() * 100) / 100, G.noises.map(x => x.kind + ':' + x.st).join(',')]) }
    const r = result(); r.events = o.events ? G.events.slice() : undefined; if (o.trace) r.trace = trace
    SIM = false; G.mode = keepMode === 'play' ? 'title' : keepMode; G.over = null
    return r
  },
  dbg: {
    pause(v = true) { G.paused = v; if (!v) last = performance.now() },
    step(n = 1) { for (let i = 0; i < n; i++) logic(STEP); render(0) },
    tick(n = 1) { for (let i = 0; i < n; i++) logic(STEP) },
    speed(k) { G.speed = k },
    render() { render(0) },
    G, newGame, startPlay, showResult, spawn, finish, cutin,
    set(o) { Object.assign(G, o) },
    camera, scene, CAM, say, sayAt,
  },
}
window.bn = api
// bot: 人間の速さで動く（気配に気づくまで react 秒・押す判断は amp を見て）
const BOTS = {
  idle() {},
  // 揺らすだけ: 端に来たら押す（揺れが小さい時だけ）。邪魔者は見ない
  rock(api, st) { const s = api.state; if (s.win && s.amp < (st.hi ?? 0.55) && s.amp >= 0) api.push() },
  // 排除だけ: 気配に気づいたら止める。揺らさない
  clear(api, st, dt) { const s = api.state; st.seen = st.seen || {}; for (const n of s.noises) if (n.st === 'warn' || n.st === 'on') { const k = n.kind + n.at; st.seen[k] = (st.seen[k] || 0) + dt; if (st.seen[k] >= (st.react ?? 0.6)) { if (api.tapSrc(n.src) !== 'busy') st.seen[k] = -99 } } },
  // 連打: かごも的もでたらめに叩く
  spam(api, st) { if (st.r() < 0.06) api.push(); if (st.r() < 0.02) api.tapSrc(api.SRC[Math.floor(st.r() * api.SRC.length)]) },
  // 上手い / 普通: 揺らしながら、気配を見て止める。止めるのは揺れの真ん中（押せない時間）を選ぶ
  good(api, st, dt) {
    const s = api.state; st.seen = st.seen || {}; st.cool = (st.cool || 0) - dt
    const react = st.react ?? 0.6, lo = st.lo ?? 0.5
    let want = null
    for (const n of s.noises) if (n.st === 'warn' || n.st === 'on') { const k = n.kind + n.at; st.seen[k] = (st.seen[k] || 0) + dt; if (st.seen[k] >= react && (!want || n.st === 'on')) want = n }
    if (want && (!s.win || want.st === 'on' || want.t > want.warn - 0.8 || s.amp > lo) && st.cool <= 0) { if (api.tapSrc(want.src) !== 'busy') { st.seen[want.kind + want.at] = -99; st.cool = st.gap ?? 0.3 } return }
    if (s.win && s.amp < lo && st.cool <= 0) {
      if (st.miss && st.r() < st.miss) { st.cool = 0.5; return }   // 普通の人は時々押しそびれる
      api.push(); st.cool = st.gap ?? 0.3
    }
    if (st.sloppy && st.r() < st.sloppy * dt) api.push()   // 普通の人は時々途中で押す
  },
}
BOTS.slow = (api, st, dt) => { st.react = st.react ?? 2.0; BOTS.normal(api, st, dt) }
BOTS.normal = (api, st, dt) => { st.react = st.react ?? 1.4; st.lo = st.lo ?? 0.45; st.miss = st.miss ?? 0.35; st.sloppy = st.sloppy ?? 0.25; st.gap = st.gap ?? 0.45; BOTS.good(api, st, dt) }

// ============================================================ 起動
applyLang()
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => applyLang())
const PRE = ['b_deep', 'p_nap', 'd_sleep', 'cuckoo']
const LATER = ['b_light', 'b_fuss', 'b_wail', 'b_eye', 'b_wake', 'p_sneeze', 'p_pinch', 'd_alert', 'd_bark', 'd_chew', 'k_horn', 'k_shh', 'car', 'imo', 'c_wail', 'g_aim']
let readyDone = false
function ready() {
  if (readyDone) return; readyDone = true
  for (const n of LATER) tex(n)
  for (const n of ['c_wail', 'g_aim']) { const i = new Image(); i.src = 'img/' + n + '.webp' }
  window.__bootDone = true; $('boot').classList.add('gone')
  G.mode = 'title'; show('vTitle')
  window.__bnReady = true
}
let pending = PRE.length
for (const n of PRE) { const t = tex(n); const chk = () => { if (t.image && t.image.complete !== false && t.image.width) { if (window.__bootStep) __bootStep(); if (--pending <= 0) ready() } else setTimeout(chk, 50) }; chk() }
setTimeout(ready, 9000)
requestAnimationFrame(t => { last = t; loop(t) })
