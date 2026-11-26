import '../mute-auto.mjs'   // ブラウザでは絶対に音を出さない。音は記録して ffmpeg で後から重ねる
// X 投稿用の縦長プレイ動画（1080x1920・30fps・H.264＋AAC）。node promo/film.mjs   （PROBE=1 で下見: 出来事の時刻だけ出す）
// 上手い bot（ゲーム内の BOTS.good）で揺らしながら邪魔者を止める → 場面の区間だけ撮り、間は早送り →
// 最後の全員集合で手を止めて（idle）大泣き → 劇画の赤ちゃんが銃を構える → 育児日記＋題名
// 撮影用の写し: js/game.js の最後で BOTS を窓口に出すだけ（ゲームのファイルは変えない）
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { serve, open, Recorder, mix, encode, inspect, stills } from '../../_shared/promo-film.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SLUG = 'baby-nap-guard', SEED = +(process.env.SEED || 21), PROBE = !!process.env.PROBE
const TMP = process.env.FRAMES || join(tmpdir(), `${SLUG}-frames-${Date.now()}`)
const OUT_DIR = join(homedir(), 'Desktop/バカゲー動画'); mkdirSync(OUT_DIR, { recursive: true })
// 撮る区間 [ゲーム内の秒 から, まで, bot]。'cry' は手を止めて泣くまで→結果の 2.5 秒後まで
const CUTS = JSON.parse(process.env.CUTS || '[[0.3,7.4,"good"],[45.2,50.2,"good"],[110.2,"cry","idle"]]')
const IDLE_AT = +(process.env.IDLE_AT || 0)

const srv = await serve(ROOT, { 'js/game.js': [['window.bn = api', 'window.bn = api; window.__bots = () => BOTS']] })
const { b, p, errs } = await open({ chromium, port: srv.port, path: `/?seed=${SEED}&notut`, ready: '__bnReady' })
await p.evaluate(() => {
  const F = window.__film
  F.hookSnd(); F.on()
  bn.dbg.G.playNo = 0
  F.evN = 0
})
// タイトルの「はじめる」を本物の指で押す（Snd.init と環境音の開始まで本物の流れで）
await p.evaluate(() => {
  const btn = document.getElementById('bStart'); btn.click(); return btn.textContent
}).then(t => console.log('start button:', t))

const tick = (F, a) => {
  const G = bn.dbg.G
  for (const e of (G.events || []).slice(F.evN)) F.mark(Array.isArray(e) ? e.join(':') : JSON.stringify(e))
  F.evN = (G.events || []).length
  if (a.bot !== F.botName) { F.botName = a.bot; bn.dbg.set({ bot: a.bot === 'idle' ? null : window.__bots()[a.bot], botSt: null }) }
  if (G.mode === 'result' && F.resF == null) { F.resF = F.all || 0 }
  F.all = (F.all || 0) + 1
  if (a.mode === 'until') return G.t >= a.t || !!G.over
  if (a.mode === 'result') return F.resF != null && F.all - F.resF >= a.n
  return false
}
const rec = new Recorder(p, TMP)
if (PROBE) {
  await rec.run(tick, { ff: true, max: 30 * 140, arg: { mode: 'until', t: IDLE_AT || 999, bot: 'good' } })
  await rec.run(tick, { ff: true, max: 30 * 60, arg: { mode: 'result', n: 1, bot: 'idle' } })
  console.log(JSON.stringify(await p.evaluate(() => ({ notes: window.__film.notes.map(n => n[0] + '@' + n[1]).join(' '), t: bn.dbg.G.t, over: bn.dbg.G.over }))))
  console.log('errors', errs)
  await b.close(); srv.close(); process.exit(0)
}
const segs = []
for (const [t0, t1, bot] of CUTS) {
  await rec.run(tick, { ff: true, max: 30 * 200, arg: { mode: 'until', t: t0, bot: 'good' } })   // 早送りの間は上手く守る
  const v0 = rec.sec
  if (t1 === 'cry') await rec.run(tick, { max: 30 * 40, arg: { mode: 'result', n: 75, bot } })
  else await rec.run(tick, { max: 30 * 30, arg: { mode: 'until', t: t1, bot } })
  segs.push([t0, t1, v0, rec.sec])
}
await p.evaluate(() => {
  const c = document.createElement('div'); c.textContent = '寝かしつけ防衛戦'
  c.style.cssText = 'position:fixed;left:0;right:0;top:27%;z-index:99998;text-align:center;font:800 44px "Shippori Mincho B1",serif;color:#fff;-webkit-text-stroke:3px #1a1a1a;paint-order:stroke;text-shadow:0 5px 0 #1a1a1a;pointer-events:none'
  document.body.appendChild(c)
})
await rec.run(tick, { max: 45, arg: { mode: 'x', bot: 'idle' } })
const log = await p.evaluate(() => ({ rec: window.__film.rec, gains: window.__film.gains, notes: window.__film.notes }))
await b.close(); srv.close()

const dur = rec.sec
const wav = join(TMP, 'mix.wav'), out = join(OUT_DIR, `${SLUG}-x-1080x1920.mp4`)
mix({ rec: log.rec, gains: log.gains, dur, root: ROOT, out: wav })
encode({ frames: TMP, wav, out })
const info = inspect(out)
const st = stills(out, [0.5, ...segs.map(s => (s[2] + s[3]) / 2), dur - 0.6], join(TMP, 'still'))
writeFileSync(join(ROOT, 'promo/film-log.json'), JSON.stringify({ seed: SEED, cuts: CUTS, segs, info, notes: log.notes, errs, frames: TMP }, null, 1))
console.log(JSON.stringify({ out, info, segs, errs }, null, 1))
