import '../mute-auto.mjs'
// 撮影用。node tools/shot.mjs <名前> <幅> <高さ> [台本...]  台本: title / how / play / mosq / mosqnear / mosqbusy / warn / on / fuss / tut / eye / cry / gekiga / win / result / resultko / boot
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = new URL('..', import.meta.url).pathname
const PORT = 0   // 空いている番号をサーバーに選ばせる
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
// サーバーが立ったのを確かめる（前に落ちた回のサーバーが同じ番号に残っていると、古いフォルダを開いたまま気づけない。2026-11-11）
const BASE = await new Promise((ok, ng) => { server.stdout.once('data', d => ok(String(d).trim())); server.once('exit', c => ng(new Error('server.mjs が起動できない'))) })
const [name = 'x', w = 390, h = 844, ...scenes] = process.argv.slice(2)
const B = process.env.WK ? webkit : chromium
const b = await B.launch(), ctx = await b.newContext({ locale: process.env.EN ? 'en-US' : 'ja-JP', viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('requestfailed', r => errs.push('fail ' + r.url()))
await p.goto(`${BASE}/?notut&seed=${process.env.SEED || 5}`); await p.waitForFunction(() => window.__bnReady); await p.waitForTimeout(900)
for (const sc of (scenes.length ? scenes : ['title'])) {
  if (sc === 'title') {}
  else if (sc === 'how') await p.click('#bHow')
  else {
    await p.evaluate(sc => {
      const d = bn.dbg, G = d.G; document.querySelector('#vHow').hidden = true
      if (sc === 'tut') d.startPlay(true); else d.startPlay()
      d.pause(true)
      if (sc === 'tut') d.step(60 * 1.2)
      if (sc === 'play') d.step(60 * 2.3)
      if (sc === 'warn') { d.step(20); d.spawn('dog'); d.spawn('bell'); d.spawn('car'); d.step(80) }
      if (sc === 'on') { d.step(20); const n = d.spawn('sneeze'); n.t = n.warn - 0.02; const m = d.spawn('kid'); m.t = m.warn; d.spawn('phone').t = 9; d.step(3) }
      if (sc === 'warn2') { d.step(20); d.spawn('karaoke').t = 2; d.spawn('clock').t = 2.2; d.spawn('gran').t = 9; d.step(10) }
      if (sc === 'storm') { G.t = 66; d.step(20); d.spawn('thunder').t = 1; d.spawn('kid2').t = 3; d.step(10) }
      if (sc === 'curtain') { G.t = 66; d.step(20); d.spawn('thunder'); d.step(2); bn.tapSrc('window'); d.step(40) }
      if (sc === 'vacuum') { G.t = 95; d.step(20); const n = d.spawn('vacuum'); n.t = n.warn + 2; d.spawn('kid3').t = 1; d.step(10) }
      if (sc === 'visit') { G.t = 103; d.step(20); d.spawn('granvisit').t = 2.5; d.spawn('gran').t = 1; d.step(10) }
      if (sc === 'climax') { G.t = 110.9; G.fixed.combo = G.fixed.vacuum = G.fixed.visit = 0; d.step(20); d.step(60) }
      if (sc === 'winmilk') { d.step(20); G.t = 119.9; d.step(60 * 2.4) }
      if (sc === 'mosq') { G.t = 40; G.mqNext = 999; d.step(20); d.mqSpawn(); G.mq.t = 2.2; d.step(2) }
      if (sc === 'mosqnear') { G.t = 40; G.mqNext = 999; d.step(20); d.mqSpawn(); G.mq.t = G.mq.T - 0.6; d.step(2) }
      if (sc === 'mosqbusy') { G.t = 66; G.mqNext = 999; d.step(20); d.spawn('thunder').t = 1; d.spawn('dog').t = 1; d.mqSpawn(); G.mq.t = 3; d.step(2) }
      if (sc === 'fuss') { d.step(20); G.S = 25; d.step(30) }
      if (sc === 'eye') { d.step(20); G.eyeT = 1; d.step(5) }
      if (sc === 'cry') { d.step(20); G.S = 1; G.th = 0; G.v = 0; d.step(60 * 0.6) }
      if (sc === 'gekiga') { d.step(20); G.S = 1; G.th = 0; G.v = 0; d.step(60 * 3.0) }
      if (sc === 'win') { d.step(20); G.t = 119.9; d.step(60) }
      if (sc === 'result') { d.step(20); G.t = 119.9; d.step(10); G.prevented = 11; G.stopped = 3; G.through = 1; G.jolts = 2; G.hist = Array.from({ length: 120 }, (_, i) => Math.round(70 + 25 * Math.sin(i / 9) - (i % 23 < 4 ? 20 : 0))); G.log = [[8, 'dog', 'p'], [17, 'bell', 'p'], [26, 'kid', 's'], [40, 'car', 'p'], [52, 'phone', 't'], [60, 'clock', 'p'], [75, 'sneeze', 'p'], [90, 'karaoke', 's'], [104, 'dog', 'p']]; G.sumS = 82 * 120; G.mqSeen = 3; G.mqKills = 3; G.mqBites = 0; G.mqNear = 1; d.showResult() }
      if (sc === 'resultko') { d.step(20); G.t = 47; G.hist = Array.from({ length: 47 }, (_, i) => Math.max(0, Math.round(72 - i * 1.4 + 10 * Math.sin(i / 4)))); G.log = [[8, 'dog', 'p'], [19, 'kid', 't'], [33, 'sneeze', 't']]; G.mqSeen = 1; G.mqKills = 0; G.mqBites = 1; G.S = 1; d.step(2); G.S = 0; d.finish('cry'); d.pause(false) }
    }, sc)
    await p.waitForTimeout(sc === 'result' ? 1600 : sc === 'resultko' ? 7000 : 500)
  }
  await p.screenshot({ path: `${ROOT}shots/${name}-${sc}.png` })
}
if (errs.length) console.log(errs)
await b.close(); server.kill()
