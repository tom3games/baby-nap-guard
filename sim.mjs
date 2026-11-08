import './mute-auto.mjs'
// bot の分布。node sim.mjs [回数=12]  上手い/普通/揺らすだけ/排除だけ/連打/何もしない を種を変えて回す
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 5409
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const N = +(process.argv[2] || 12)
const b = await chromium.launch(), p = await b.newPage()
await p.goto(`http://localhost:${PORT}/?notut`); await p.waitForFunction(() => window.__bnReady)
const out = await p.evaluate(N => {
  const res = {}
  for (const bot of ['good', 'normal', 'slow', 'rock', 'clear', 'spam', 'idle']) {
    const rs = []; for (let s = 1; s <= N; s++) rs.push(bn.sim(bot, s * 101))
    const pts = rs.map(r => r.points), alive = rs.filter(r => !r.ko).length
    res[bot] = { avg: Math.round(pts.reduce((a, b) => a + b, 0) / N), min: Math.min(...pts), max: Math.max(...pts), alive: alive + '/' + N, sec: Math.round(rs.reduce((a, r) => a + r.sec, 0) / N), prev: Math.round(rs.reduce((a, r) => a + r.prevented, 0) / N), thr: Math.round(rs.reduce((a, r) => a + r.through, 0) / N), jolt: Math.round(rs.reduce((a, r) => a + r.jolts, 0) / N) }
  }
  return res
}, N)
for (const k in out) console.log(k.padEnd(7), JSON.stringify(out[k]))
await b.close(); server.kill()
