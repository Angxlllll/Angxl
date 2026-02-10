import os from 'os'
import { performance } from 'perf_hooks'

let handler = async (m, { conn }) => {
  const start = performance.now()

  const used = process.memoryUsage()
  const totalRam = os.totalmem()
  const freeRam = os.freemem()

  const latency = performance.now() - start

  const text = `
╭──〔 ${global.namebot} 〕
│
│ ⚡ Speed: ${latency.toFixed(2)} ms
│ 🧠 RAM Used: ${(used.rss / 1024 / 1024).toFixed(1)} MB
│ 💾 RAM Free: ${(freeRam / 1024 / 1024).toFixed(1)} MB
│ 💻 Platform: ${process.platform}
│ 🟢 Uptime: ${(process.uptime() / 60).toFixed(1)} min
│
╰──────────────
`.trim()

  await conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.command = ["ping", "p"];
handler.help = ["𝖬𝗒𝗅𝗂𝖽"]
handler.tags = ["𝖮𝖶𝖭𝖤𝖱"]
export default handler;