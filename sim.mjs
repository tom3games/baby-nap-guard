import './mute-auto.mjs'
// bot の分布と単調さ。node sim.mjs [回数=12]（DIR=別のフォルダ で古い版も測れる）
// 単調さ = 新しいこと（初めて出る邪魔者・場面の切り替え・組み合わせ・全員集合）が何も起きずに、同じ操作の繰り返しだけが続いた最長秒数
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 5409
const server = spawn(process.execPath, [(process.env.DIR || import.meta.dirname) + '/server.mjs'], { cwd: process.env.DIR || import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const N = +(process.argv[2] || 12)
const b = await chromium.launch(), p = await b.newPage()
await p.goto(`http://localhost:${PORT}/?notut`); await p.waitForFunction(() => window.__bnReady)
const out = await p.evaluate(N => {
  const mono = r => { const seen = new Set(), ts = [0]; for (const [t, e] of r.events) { const m = /^spawn:(\w+)/.exec(e); if (m && !seen.has(m[1])) { seen.add(m[1]); ts.push(t) } else if (/^new:(scene|combo|climax)/.test(e)) ts.push(t) } ts.push(r.sec); ts.sort((a, b) => a - b); let g = 0; for (let i = 1; i < ts.length; i++) g = Math.max(g, ts[i] - ts[i - 1]); return g }
  const res = {}
  for (const bot of ['good', 'normal', 'slow', 'rock', 'clear', 'spam', 'idle']) {
    const rs = []; for (let s = 1; s <= N; s++) rs.push(bn.sim(bot, s * 101, { events: true }))
    const avg = f => Math.round(rs.reduce((a, r) => a + f(r), 0) / N * 10) / 10
    const pts = rs.map(r => r.points)
    res[bot] = { avg: avg(r => r.points), min: Math.min(...pts), max: Math.max(...pts), alive: rs.filter(r => !r.ko).length + '/' + N, sec: avg(r => r.sec), jolt: avg(r => r.jolts), minLate: avg(r => r.minLate ?? 0), danger: rs.filter(r => r.minLate != null && r.minLate < 40).length, mono: avg(mono), monoMax: Math.max(...rs.map(mono)) }
  }
  return res
}, N)
for (const k in out) console.log(k.padEnd(7), JSON.stringify(out[k]))
await b.close(); server.kill()
