import axios from "axios"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

const AXIOS_CFG = {
  timeout: 20000,
  headers: {
    "User-Agent": UA,
    "Accept": "*/*",
    "Referer": "https://www.facebook.com/",
    "Origin": "https://www.facebook.com"
  }
}

async function retry(fn, times = 3) {
  let lastErr
  for (let i = 0; i < times; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

async function getFBVideo(url) {
  const providers = [
    async () => {
      const r = await axios.get(
        `https://api.dorratz.com/fbvideo?url=${encodeURIComponent(url)}`,
        AXIOS_CFG
      )
      const data = r.data
      if (!Array.isArray(data)) return null
      const best =
        data.find(v => /hd/i.test(v.quality || "")) || data[0]
      return best?.url || null
    },

    async () => {
      const r = await axios.get(
        `https://fdownloader.net/api?url=${encodeURIComponent(url)}`,
        AXIOS_CFG
      )
      return r.data?.video || null
    }
  ]

  for (const fn of providers) {
    try {
      const video = await retry(fn, 2)
      if (video) return video
    } catch {}
  }

  return null
}

const handler = async (msg, { conn, args }) => {
  const chatId = msg.key.remoteJid
  const text = args.join(" ").trim()

  if (!text)
    return conn.sendMessage(
      chatId,
      { text: "🔗 *Ingresa un link de Facebook*" },
      { quoted: msg }
    )

  if (!/(facebook\.com|fb\.watch)/i.test(text))
    return conn.sendMessage(
      chatId,
      { text: "🚩 *Link de Facebook inválido*" },
      { quoted: msg }
    )

  try {
    await conn.sendMessage(chatId, {
      react: { text: "🕒", key: msg.key }
    })

    const videoUrl = await getFBVideo(text)

    if (!videoUrl)
      return conn.sendMessage(
        chatId,
        { text: "🚫 *No se pudo obtener el video*" },
        { quoted: msg }
      )

    if (/\.(m3u8|mpd)/i.test(videoUrl))
      return conn.sendMessage(
        chatId,
        {
          text:
            "⚠️ *Este video es un reel/live protegido (HLS/DASH).*"
        },
        { quoted: msg }
      )

    const videoRes = await axios.get(videoUrl, {
      ...AXIOS_CFG,
      responseType: "arraybuffer"
    })

    const sizeMB = videoRes.data.byteLength / (1024 * 1024)
    if (sizeMB > 99)
      return conn.sendMessage(
        chatId,
        {
          text: `⚠️ *El archivo pesa ${sizeMB.toFixed(
            2
          )}MB*\n\n🔒 Límite: 99MB`
        },
        { quoted: msg }
      )

    await conn.sendMessage(
      chatId,
      {
        video: Buffer.from(videoRes.data),
        mimetype: "video/mp4"
      },
      { quoted: msg }
    )

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    })
  } catch (err) {
    console.error("FB ERROR:", err)
    await conn.sendMessage(
      chatId,
      { text: "❌ *Error al procesar el video de Facebook*" },
      { quoted: msg }
    )
    await conn.sendMessage(chatId, {
      react: { text: "❌", key: msg.key }
    })
  }
}

handler.command = ["facebook", "fb"]
handler.help = ["facebook <url>"]
handler.tags = ["descargas"]

export default handler