import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 寝かしつけ防衛戦の検証。node verify.mjs（音は出さない。押す操作は全部 page.mouse / touchscreen の本物の指）
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5411
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, q = '') {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  if (!opts.keepStore) await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('k')) { localStorage.clear(); sessionStorage.setItem('k', '1') } } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0 + q); await p.waitForFunction(() => window.__bnReady, null, { timeout: 12000 })
  await p.waitForTimeout(300)
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *, #gekiga:not([hidden]) p')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    if (el.closest('#marks,#hand') || el.id === 'bubble') continue   // 3D の物に付く印と吹き出しは画面の端で寄せる
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) a,main:not([hidden]) canvas,main:not([hidden]) h1,#gekiga:not([hidden]) p')) { if (!el.offsetParent && el.id !== 'card') continue; const r = el.getBoundingClientRect(); if (!r.height) continue; if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  return { H, over: over.slice(0, 6) }
})
const variance = (p, sel) => p.evaluate(sel => {
  const c = document.querySelector(sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 13) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
  return Math.round(s2 / n - (s / n) ** 2)
}, sel)
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'big']]
// 遊びを止めて、かごを端（押せる）か真ん中（ガタッ）に置く
const setSwing = (p, at) => p.evaluate(at => { const d = bn.dbg, G = d.G; d.pause(true); G.busy = 0; if (at === 'end') { G.th = 0.5; G.v = 0 } else { G.th = 0; G.v = 2 * Math.PI / 1.7 * 0.5 } d.render() }, at)
const st = p => p.evaluate(() => bn.state)
const tapXY = async (p, xy, touch) => { if (touch) await p.touchscreen.tap(xy.x, xy.y); else await p.mouse.click(xy.x, xy.y) }

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser, {}, '?seed=7')
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない（viewport・ピンチ・Ctrl+ホイール・Ctrl+プラス）', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r)); return r
})
await t('OGP 一式と canonical・github.io からの転送がある', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => !!document.querySelector(`meta[property="${k}"]`)).concat(!!document.querySelector('meta[name="twitter:card"]'), /tom3games\.com\/play\/baby-nap-guard\//.test(document.querySelector('link[rel=canonical]').href), !!document.getElementById('ghMove')))
  expect(r.every(Boolean), JSON.stringify(r))
})
await t('ロード画面が消えている・タイトルが出ている', async () => { const r = await p.evaluate(() => ({ boot: document.getElementById('boot').classList.contains('gone'), title: !document.getElementById('vTitle').hidden })); expect(r.boot && r.title, JSON.stringify(r)) })
// ---- 初めての1回: 本物のクリックで始めて、教える一文が出る
await t('初めての1回: 「始める」を押すと遊びが始まり、揺らす一文が出る', async () => {
  await p.click('#bStart'); await p.waitForTimeout(700)
  const r = await p.evaluate(() => ({ mode: bn.state.mode, learn: !!bn.state.learn, hint: document.getElementById('hint').hidden ? '' : document.getElementById('hint').textContent }))
  expect(r.mode === 'play' && r.learn && /タップ/.test(r.hint), JSON.stringify(r)); return r
})
await t('音を鳴らす操作の後も実際は無音（Chromium）', async () => { const r = await p.evaluate(() => ({ ok: window.__muteOk(), st: Snd.ctx && Snd.ctx.state })); expect(r.ok && r.st !== 'running', JSON.stringify(r)); return r })
await t('かごが端の時にかごをクリック → 押せる（ガタッにならない）', async () => {
  await setSwing(p, 'end'); const a = await st(p)
  await tapXY(p, await p.evaluate(() => bn.cradleXY()))
  const b = await st(p); expect(b.good === a.good + 1 && b.jolts === a.jolts && b.v !== 0, JSON.stringify({ a: a.good, b: b.good, j: b.jolts })); return { amp: Math.round(b.amp * 100) / 100 }
})
await t('かごが真ん中の時にクリック → ガタッ（眠りが減る）', async () => {
  await setSwing(p, 'mid'); const a = await st(p)
  await tapXY(p, await p.evaluate(() => bn.cradleXY()))
  const b = await st(p); expect(b.jolts === a.jolts + 1 && b.S < a.S, JSON.stringify({ a, b })); return { S: [Math.round(a.S), Math.round(b.S)] }
})
await t('押しすぎ（端で何度も押す）→ 揺らしすぎで眠りが減る', async () => {
  // 端に来るたびに毎回押し続ける（6秒）
  const r = await p.evaluate(() => { const d = bn.dbg, G = d.G; d.pause(true); G.noises = []; G.next = 999; G.th = 0.5; G.v = 0; G.busy = 0; G.S = 80; let mx = 0, was = false; for (let i = 0; i < 360; i++) { const w = bn.state.win && bn.state.amp >= 0.15; if (w && !was) bn.push(); was = w; d.tick(1); mx = Math.max(mx, bn.state.amp) } return { amp: Math.round(mx * 100) / 100, S: Math.round(G.S), strong: Math.round(G.strongT * 10) / 10 } })
  expect(r.amp > 0.82 && r.strong > 0.5 && r.S < 80, JSON.stringify(r)); return r
})
// ---- 邪魔者: 全種類を、画面の物の位置を本物の指で押して止める
await t('全種類の邪魔者を、気配の間に物をクリックして止められる', async () => {
  const kinds = ['bell', 'dog', 'kid', 'phone', 'karaoke', 'sneeze', 'car', 'clock', 'imo', 'gran'], out = {}
  for (const k of kinds) {
    const xy = await p.evaluate(k => { const d = bn.dbg, G = d.G; d.pause(true); G.noises = []; G.post = {}; G.busy = 0; G.S = 80; const n = d.spawn(k); d.step(30); return bn.srcXY(n.src) }, k)
    const a = await st(p); await tapXY(p, xy); const b = await st(p)
    out[k] = b.prevented === a.prevented + 1
  }
  expect(Object.values(out).every(Boolean), JSON.stringify(out)); return out
})
await t('鳴っている最中にクリック → 止まる（鳴ってから）', async () => {
  const xy = await p.evaluate(() => { const d = bn.dbg, G = d.G; d.pause(true); G.noises = []; G.post = {}; G.busy = 0; G.S = 80; const n = d.spawn('dog'); n.t = n.warn + 0.01; d.step(20); return bn.srcXY('dog') })
  const a = await st(p); await tapXY(p, xy); const b = await st(p)
  expect(b.stopped === a.stopped + 1 && b.noises.every(n => n.st !== 'on'), JSON.stringify(b.noises))
})
await t('鳴りきると眠りが減る（犬を放っておく）', async () => {
  const r = await p.evaluate(() => { const d = bn.dbg, G = d.G; d.pause(true); G.noises = []; G.post = {}; G.S = 90; G.th = 0.5; G.v = 0; d.spawn('dog'); const s0 = G.S; G.learn = null; d.tick(60 * 6); return { dS: Math.round(G.S - s0), through: G.through, barks: Snd.played.bark || 0 } })
  expect(r.dS < -20 && r.barks > 0, JSON.stringify(r)); return r
})
await t('手は1本: 物を押した直後はかごを押せない', async () => {
  const r = await p.evaluate(() => { const d = bn.dbg, G = d.G; d.pause(true); G.noises = []; G.post = {}; G.busy = 0; G.th = 0.5; G.v = 0; bn.tapSrc('phone'); return [bn.push(), G.busy > 0] })
  expect(r[0] === 'busy' && r[1], JSON.stringify(r))
})
await t('音の出どころは3つの的とも、かごの押す場所と重ならない', async () => {
  const r = await p.evaluate(() => { const c = document.getElementById('cradleHit').getBoundingClientRect(); return bn.SRC.filter(s => { const q = bn.srcXY(s); return q.x > c.left && q.x < c.right && q.y > c.top && q.y < c.bottom }) })
  expect(!r.length, r.join(','))
})
await t('起きかけ（ぐずる）間は普通の赤ちゃんの顔で、渋い顔は泣かせきった後だけ', async () => {
  const r = await p.evaluate(() => { const d = bn.dbg, G = d.G; d.pause(true); G.noises = []; G.eyeT = 0; G.th = 0.5; G.v = 0; const out = {}; for (const s of [90, 50, 20, 3]) { G.S = s; d.render(); out[s] = bn.state.face } return out })
  expect(r[90] === 'b_deep' && r[50] === 'b_light' && r[20] === 'b_fuss' && r[3] === 'b_fuss' && !Object.values(r).some(f => /^g_/.test(f)), JSON.stringify(r)); return r
})
// ---- 指示と違う操作でも固まらない（初めての1回で）
await p.close()
for (const [name, ops] of [
  ['真ん中ばかり連打', async q => { for (let i = 0; i < 10; i++) { await q.mouse.click(195, 760); await q.waitForTimeout(60) } }],
  ['部屋をスワイプ', async q => { await q.mouse.move(80, 300); await q.mouse.down(); await q.mouse.move(320, 420, { steps: 8 }); await q.mouse.up() }],
  ['何もない所をタップ', async q => { for (const [x, y] of [[20, 400], [370, 300], [195, 120]]) await q.mouse.click(x, y) }],
  ['気配が無い物ばかりタップ', async q => { for (const s of ['papa', 'clock', 'window', 'frame']) { const xy = await q.evaluate(s => bn.srcXY(s), s); await q.mouse.click(xy.x, xy.y); await q.waitForTimeout(450) } }],
  ['何もしない', async q => {}],
]) {
  await t(`初めての1回で「${name}」→ 時間は進み、最後は結果画面まで行く`, async () => {
    const q = await open(browser)
    await q.click('#bStart'); await q.waitForTimeout(300)
    await ops(q)
    const t1 = await q.evaluate(() => bn.state.t); await q.waitForTimeout(600); const t2 = await q.evaluate(() => bn.state.over ? 1e9 : bn.state.t)
    await q.evaluate(() => bn.dbg.speed(12))
    await q.waitForFunction(() => !document.getElementById('vResult').hidden && window.__lastResult, null, { timeout: 30000 })
    const r = await q.evaluate(() => ({ r: window.__lastResult, errs: 0 }))
    await q.close()
    expect(t2 > t1 && r.r, JSON.stringify({ t1, t2 })); return { over: r.r.ko ? 'cry' : 'win', sec: r.r.sec }
  })
}
// ---- 泣かせきった: 大泣き → 渋い顔で銃を構える → 一言 → 暗転 → 結果
{
  const q = await open(browser, {}, '?notut&seed=3')
  await t('何もしないと泣いて、渋い顔の大ゴマと一言が出る（撃つ・倒れる場面はない）', async () => {
    await q.click('#bStart'); await q.evaluate(() => bn.dbg.speed(4))
    await q.waitForFunction(() => !document.getElementById('gekiga').hidden, null, { timeout: 30000 })
    await q.evaluate(() => bn.dbg.speed(1)); await q.waitForTimeout(1200)
    const r = await q.evaluate(() => ({ img: document.getElementById('gekigaImg').src.split('/').pop(), line: document.getElementById('gekigaLine').textContent, on: document.getElementById('gekigaLine').classList.contains('on'), cock: Snd.played.cock || 0, wail: Snd.played.wail || 0 }))
    await q.screenshot({ path: ROOT + '/shots/v-gekiga.png' })
    expect(r.img === 'g_aim.webp' && r.line.length > 3 && r.on && r.cock === 1 && r.wail >= 1, JSON.stringify(r)); return r
  })
  await t('暗転のあと結果（育児日記）が出て、何もしないは最低の称号・点', async () => {
    await q.waitForFunction(() => !document.getElementById('vResult').hidden, null, { timeout: 8000 }); await q.waitForTimeout(500)
    const r = await q.evaluate(() => window.__lastResult)
    const v = await variance(q, '#card')
    await q.screenshot({ path: ROOT + '/shots/v-result-ko.png' })
    expect(r.ko && r.title === '即、消される人' && r.points <= 10 && v > 300, JSON.stringify({ r, v })); return { title: r.title, points: r.points, sec: r.sec, v }
  })
  await t('結果: Xでポストの文と、画像の保存ボタンが動く', async () => {
    const href = await q.getAttribute('#bPost', 'href')
    const [dl] = await Promise.all([q.waitForEvent('download', { timeout: 5000 }), q.click('#bSave')])
    expect(/x\.com\/intent\/post/.test(href) && /tom3games\.com%2Fplay%2Fbaby-nap-guard/.test(href) && dl.suggestedFilename() === 'baby-nap-guard.png', href); return { file: dl.suggestedFilename() }
  })
  await t('結果: もう一回で遊びに戻る・支援ボタンと横丁へ戻るがある', async () => {
    const r = await q.evaluate(() => ({ sup: !!document.getElementById('tmSupport'), home: !!document.getElementById('tmHome') }))
    await q.click('#bAgain'); await q.waitForTimeout(400)
    const m = await q.evaluate(() => ({ mode: bn.state.mode, t: bn.state.t, gek: document.getElementById('gekiga').hidden }))
    expect(r.sup && r.home && m.mode === 'play' && m.t < 2 && m.gek, JSON.stringify({ r, m })); return r
  })
  await q.close()
}
// ---- 15時まで守りきる
{
  const q = await open(browser, {}, '?notut&seed=4')
  await t('15時まで寝かせきると、起きてにっこり → 結果に眠りの深さと称号', async () => {
    await q.click('#bStart')
    await q.evaluate(() => { bn.dbg.G.bot = (api, st, dt) => { const s = api.state; for (const n of s.noises) if (n.st === 'warn' || n.st === 'on') api.tapSrc(n.src); if (s.win && s.amp < 0.5) api.push() }; bn.dbg.speed(12) })
    await q.waitForFunction(() => !document.getElementById('vResult').hidden, null, { timeout: 40000 }); await q.waitForTimeout(500)
    const r = await q.evaluate(() => window.__lastResult)
    await q.screenshot({ path: ROOT + '/shots/v-result-win.png' })
    expect(!r.ko && r.points >= 80 && r.title, JSON.stringify(r)); return { points: r.points, title: r.title }
  })
  await q.close()
}
// ---- 同じ種なら同じ結果・bot の分布
{
  const q = await open(browser)
  await t('同じ種・同じ操作なら同じ結果', async () => { const r = await q.evaluate(() => [bn.sim('normal', 42), bn.sim('normal', 42)].map(x => x.points + ':' + x.sec + ':' + x.prevented)); expect(r[0] === r[1], r.join(' ')); return r[0] })
  await t('bot の分布: 上手い・普通は生き残り、揺らすだけ・排除だけ・連打・何もしないは泣かせる', async () => {
    const r = await q.evaluate(() => { const o = {}; for (const b of ['good', 'normal', 'rock', 'clear', 'spam', 'idle']) { const rs = []; for (let s = 1; s <= 8; s++) rs.push(bn.sim(b, s * 31)); o[b] = { alive: rs.filter(x => !x.ko).length, avg: Math.round(rs.reduce((a, x) => a + x.points, 0) / 8) } } return o })
    expect(r.good.alive === 8 && r.normal.alive >= 7 && ['rock', 'clear', 'spam', 'idle'].every(b => r[b].alive === 0 && r[b].avg < 20), JSON.stringify(r)); return r
  })
  await t('遊び中に同時に出る文字は2つまで（教える一文＋吹き出し）', async () => {
    const r = await q.evaluate(async () => { const d = bn.dbg; d.startPlay(true); d.pause(true); let mx = 0; for (let i = 0; i < 60 * 40; i += 6) { d.step(6); if (i % 120 === 0) { const n = d.G.noises; if (n.length < 2) d.spawn(['dog', 'bell', 'kid'][i % 3]) } const vis = [...document.querySelectorAll('#bubble,#hint')].filter(e => !e.hidden).length; mx = Math.max(mx, vis) } return mx })
    expect(r <= 2, r); return r
  })
  await q.close()
}
// ---- 英語
{
  const q = await open(browser)
  await t('English に切り替えると文言が英語になり、はみ出さない', async () => {
    await q.click('#bLang'); await q.waitForTimeout(200)
    const r = await q.evaluate(() => ({ t2: document.getElementById('t2').textContent, start: document.getElementById('bStart').textContent, lang: document.documentElement.lang }))
    const o = await overflow(q)
    await q.click('#bHow'); const o2 = await overflow(q); const f2 = await fit(q)
    expect(r.t2 === 'Nap Defense' && r.lang === 'en' && !o.bad.length && !o2.bad.length && !f2.over.length, JSON.stringify({ r, o, o2, f2 })); return r
  })
  await q.close()
}
// ---- 3サイズ × 全画面で一画面に収まる・はみ出さない
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h } }, '?notut&seed=5')
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await q.click('#bHowClose')
  await q.click('#bStart'); await q.evaluate(() => { const d = bn.dbg; d.pause(true); d.spawn('dog'); d.spawn('car'); d.step(90) }); views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  const inside = await q.evaluate(() => { const W = innerWidth, H = innerHeight; return bn.SRC.filter(s => { const p = bn.srcXY(s); return !(p.x > 8 && p.x < W - 8 && p.y > 60 && p.y < H - 20) }) })
  await t(`${name}: 音の出どころが全部画面の中にある`, async () => { expect(!inside.length, inside.join(',')) })
  const ov1 = await overflow(q)
  await q.evaluate(() => { const d = bn.dbg; d.G.S = 0.5; d.pause(false); d.speed(1) })
  await q.waitForFunction(() => !document.getElementById('gekiga').hidden && document.getElementById('gekigaLine').classList.contains('on'), null, { timeout: 8000 })
  views.gekiga = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-gekiga.png` })
  await q.waitForFunction(() => !document.getElementById('vResult').hidden, null, { timeout: 8000 }); await q.waitForTimeout(400)
  views.result = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !ov1.bad.length && !q.errs.length, JSON.stringify([ov1, o]) + q.errs.join('|')) })
  await q.close()
}
await browser.close()
// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '?notut&seed=9')
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タップで始めて、かごをタップで押せる・物をタップで止められる', async () => {
  const b = await wp.$('#bStart'), bb = await b.boundingBox(); await wp.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await wp.waitForTimeout(400)
  await setSwing(wp, 'end'); const a = await st(wp)
  await tapXY(wp, await wp.evaluate(() => bn.cradleXY()), true)
  const xy = await wp.evaluate(() => { const d = bn.dbg, G = d.G; G.busy = 0; G.noises = []; d.spawn('kid'); d.step(40); return bn.srcXY('kid') })
  await tapXY(wp, xy, true)
  const c = await st(wp)
  expect(c.good === a.good + 1 && c.prevented === a.prevented + 1, JSON.stringify({ a: [a.good, a.prevented], c: [c.good, c.prevented] }))
})
await t('WebKit: 実際には無音', async () => { const r = await wp.evaluate(() => ({ ok: window.__muteOk(), st: Snd.ctx && Snd.ctx.state })); expect(r.ok && r.st !== 'running', JSON.stringify(r)); return r })
await t('WebKit: 泣かせきって結果まで（エラーなし）', async () => {
  await wp.evaluate(() => { const d = bn.dbg; d.G.S = 0.5; d.pause(false); d.speed(2) })
  await wp.waitForFunction(() => !document.getElementById('vResult').hidden, null, { timeout: 12000 })
  await wp.screenshot({ path: ROOT + '/shots/v-webkit-result.png' })
  expect(wp.errs.length === 0, wp.errs.join('|'))
})
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
