import axios from "axios"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

const AXIOS_CFG = {
  timeout: 20000,
  headers: {
    "User-Agent": UA,
    "Accept": "*/*",
    "Referer": "https://www.instagram.com/",
    "Origin": "https://www.instagram.com"
  }
}

/* retry simple */
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

/* proveedores IG en cascada */
async function getIGMedia(url) {
  const providers = [
    async () => {
      const r = await axios.get(
        `https://api.dorratz.com/igdl?url=${encodeURIComponent(url)}`,
        AXIOS_CFG
      )
      return r.data?.data || null
    },

    async () => {
      const r = await axios.get(
        `https://snapinsta.app/api/ajaxSearch`,
        {
          ...AXIOS_CFG,
          params: { q: url, t: "media", lang: "es" }
        }
      )
      return r.data?.medias || null
    }
  ]

  for (const fn of providers) {
    try {
      const data = await retry(fn, 2)
      if (Array.isArray(data) && data.length) return data
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
      { text: "🔗 *Ingresa un link de Instagram*" },
      { quoted: msg }
    )

  if (!/instagram\.com/i.test(text))
    return conn.sendMessage(
      chatId,
      { text: "🚩 *Link de Instagram inválido*" },
      { quoted: msg }
    )

  try {
    await conn.sendMessage(chatId, {
      react: { text: "🕒", key: msg.key }
    })

    const media = await getIGMedia(text)

    if (!media)
      return conn.sendMessage(
        chatId,
        { text: "❌ *No se pudo obtener el contenido de Instagram*" },
        { quoted: msg }
      )

    for (const item of media) {
      const url = item.url || item.download || item.src
      if (!url) continue

      if (/\.(m3u8|mpd)/i.test(url)) {
        await conn.sendMessage(
          chatId,
          { text: "⚠️ *Este reel está protegido (HLS/DASH)*" },
          { quoted: msg }
        )
        continue
      }

      const res = await axios.get(url, {
        ...AXIOS_CFG,
        responseType: "arraybuffer"
      })

      const sizeMB = res.data.byteLength / (1024 * 1024)
      if (sizeMB > 99) {
        await conn.sendMessage(
          chatId,
          {
            text: `⚠️ *Archivo demasiado grande (${sizeMB.toFixed(
              2
            )}MB)*\nLímite: 99MB`
          },
          { quoted: msg }
        )
        continue
      }

      await conn.sendMessage(
        chatId,
        {
          video: Buffer.from(res.data),
          mimetype: "video/mp4"
        },
        { quoted: msg }
      )
    }

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    })
  } catch (err) {
    console.error("IG ERROR:", err)
    await conn.sendMessage(
      chatId,
      { text: "❌ *Error al procesar el enlace de Instagram*" },
      { quoted: msg }
    )
    await conn.sendMessage(chatId, {
      react: { text: "❌", key: msg.key }
    })
  }
}

handler.command = ["instagram", "ig"]
handler.help = ["instagram <url>"]
handler.tags = ["descargas"]

export default handler