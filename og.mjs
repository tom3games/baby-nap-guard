import './mute-auto.mjs'
// SNS 用の画像（1200x630）。泣かせきった後の、渋い顔で銃を構える大ゴマ＋題名。node og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const PORT = 5412
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/?notut&seed=11`); await p.waitForFunction(() => window.__bnReady); await p.waitForTimeout(800)
await p.evaluate(async () => {
  const d = bn.dbg; d.startPlay(); d.pause(true); d.step(20); d.finish('cry'); d.step(2)
  for (let i = 0; i < 60 * 2.4; i++) d.step(1)
  const g = document.getElementById('gekiga'); g.querySelector('p').textContent = '……次はないぞ'; g.querySelector('p').classList.add('on')
  g.classList.remove('out')
  const st = document.createElement('style'); st.textContent = `
    #gekiga{justify-content:flex-start;padding-left:70px;gap:40px}
    #gekiga img{height:600px;animation:none;transform:none;margin-top:30px}
    #gekiga p{font-size:56px;max-width:none;margin-top:60px}
    #ogT{position:fixed;right:44px;top:56px;z-index:20;text-align:right;transform:rotate(1.5deg)}
    #ogT .pl{display:inline-block;background:#f3e2c2;border-radius:24px;padding:14px 26px 18px;box-shadow:0 8px 20px rgba(0,0,0,.35);background-image:repeating-linear-gradient(94deg,rgba(150,110,60,.07) 0 3px,transparent 3px 11px)}
    #ogT small{display:block;font:500 24px "Kiwi Maru";color:#7a5a36;letter-spacing:.06em}
    #ogT b{display:block;font:500 64px "Kiwi Maru";color:#c24a68;line-height:1.15}
    #ogT .sub{margin-top:14px;font:600 26px "Klee One";color:#111;background:#fff;border:3px solid #111;padding:6px 14px;display:inline-block}`
  document.head.appendChild(st)
  const t = document.createElement('div'); t.id = 'ogT'; t.innerHTML = '<div class="pl"><small>赤ちゃんを起こすな</small><b>寝かしつけ防衛戦</b></div><br><span class="sub">泣かせきったら、赤ちゃんが本気を出す</span>'
  document.body.appendChild(t)
  const ph = document.createElement('div'); ph.style.cssText = 'position:fixed;right:70px;bottom:40px;z-index:20;width:230px;height:190px;background:#fff;padding:10px;transform:rotate(-4deg);box-shadow:0 8px 18px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center'; ph.innerHTML = '<img src="img/b_deep.webp" style="width:100%;height:100%;object-fit:contain;background:#f3e7cf"><i style="position:absolute;top:-12px;left:70px;width:90px;height:24px;background:rgba(233,165,182,.8)"></i>'; document.body.appendChild(ph); await new Promise(r => setTimeout(r, 300))
  await document.fonts.ready
})
await p.waitForTimeout(500)
await p.screenshot({ path: ROOT + '/og.png' })
await b.close(); server.kill()
