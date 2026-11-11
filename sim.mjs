import './mute-auto.mjs'
// bot の分布と単調さ（v3 から蚊の数も: mosq=来た数・mqKill=倒した・mqBite=刺された・mqNear=顔の近くで叩いた。1回あたり）。node sim.mjs [回数=12]（DIR=別のフォルダ で古い版も測れる）
// 単調さ = 新しいこと（初めて出る邪魔者・場面の切り替え・組み合わせ・全員集合）が何も起きずに、同じ操作の繰り返しだけが続いた最長秒数
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 0   // 空いている番号をサーバーに選ばせる
const server = spawn(process.execPath, [(process.env.DIR || import.meta.dirname) + '/server.mjs'], { cwd: process.env.DIR || import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
// サーバーが立ったのを確かめる（前に落ちた回のサーバーが同じ番号に残っていると、古いフォルダを開いたまま気づけない。2026-11-11 sim で踏んだ）
const BASE = await new Promise((ok, ng) => { server.stdout.once('data', d => ok(String(d).trim())); server.once('exit', c => ng(new Error('server.mjs が起動できない'))) })
const N = +(process.argv[2] || 12)
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 844 } })   // 蚊は画面の座標で狙うのでスマホ縦で測る
await p.goto(BASE + '/?notut'); await p.waitForFunction(() => window.__bnReady)
const out = await p.evaluate(N => {
  const mono = r => { const seen = new Set(), ts = [0]; for (const [t, e] of r.events) { const m = /^spawn:(\w+)/.exec(e); if (m && !seen.has(m[1])) { seen.add(m[1]); ts.push(t) } else if (/^new:(scene|combo|climax)/.test(e)) ts.push(t) } ts.push(r.sec); ts.sort((a, b) => a - b); let g = 0; for (let i = 1; i < ts.length; i++) g = Math.max(g, ts[i] - ts[i - 1]); return g }
  const res = {}
  for (const bot of ['good', 'normal', 'slow', 'rock', 'clear', 'spam', 'idle']) {
    const rs = []; for (let s = 1; s <= N; s++) rs.push(bn.sim(bot, s * 101, { events: true }))
    const avg = f => Math.round(rs.reduce((a, r) => a + f(r), 0) / N * 10) / 10
    const pts = rs.map(r => r.points)
    res[bot] = { avg: avg(r => r.points), min: Math.min(...pts), max: Math.max(...pts), alive: rs.filter(r => !r.ko).length + '/' + N, sec: avg(r => r.sec), jolt: avg(r => r.jolts), minLate: avg(r => r.minLate ?? 0), danger: rs.filter(r => r.minLate != null && r.minLate < 40).length, mono: avg(mono), monoMax: Math.max(...rs.map(mono)), mosq: avg(r => r.mq ? r.mq.seen : 0), mqKill: avg(r => r.mq ? r.mq.kills : 0), mqBite: avg(r => r.mq ? r.mq.bites : 0), mqNear: avg(r => r.mq ? r.mq.near : 0) }
  }
  return res
}, N)
for (const k in out) console.log(k.padEnd(7), JSON.stringify(out[k]))
await b.close(); server.kill()
