import os from 'os'
import { performance } from 'perf_hooks'

let handler = async (m, { conn }) => {
  const used = process.memoryUsage()
  const freeRam = os.freemem()

  await conn.sendPresenceUpdate('composing', m.chat)

  const start = performance.now()

  const text = `
╭──〔 ${global.namebot} 〕
│
│ ⚡ Ping: midiendo...
│ 🧠 RAM Used: ${(used.rss / 1024 / 1024).toFixed(1)} MB
│ 💾 RAM Free: ${(freeRam / 1024 / 1024).toFixed(1)} MB
│ 💻 Platform: ${process.platform}
│ 🟢 Uptime: ${(process.uptime() / 60).toFixed(1)} min
│
╰──────────────
`.trim()

  await conn.sendMessage(m.chat, { text }, { quoted: m })

  const latency = performance.now() - start

  await conn.sendMessage(
    m.chat,
    { text: `⚡ Latencia real aproximada: ${latency.toFixed(0)} ms` },
    { quoted: m }
  )
}

handler.command = ['ping', 'p']
handler.help = ['ping']
handler.tags = ['info']
export default handler