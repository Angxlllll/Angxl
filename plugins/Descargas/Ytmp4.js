import axios from "axios"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

function isYouTube(url = "") {
  return /^https?:\/\//i.test(url) &&
    /(youtube\.com|youtu\.be|music\.youtube\.com)/i.test(url)
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {

  const chatId = msg.key.remoteJid
  const url = args.join(" ").trim()

  if (!url)
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <url de YouTube>`
    }, { quoted: msg })

  if (!isYouTube(url))
    return conn.sendMessage(chatId, {
      text: "❌ URL de YouTube inválida."
    }, { quoted: msg })

  await conn.sendMessage(chatId, {
    react: { text: "🕒", key: msg.key }
  })

  try {

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url,
        type: "Mp4",
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    const data = res.data

    if (
      !data ||
      typeof data !== "object" ||
      !data.status ||
      !data.result?.url ||
      !/^https?:\/\//i.test(data.result.url)
    ) {
      throw new Error("La API no devolvió un video válido")
    }

    const videoUrl = data.result.url
    const title    = data.result.title || "Video"
    const quality  = data.result.quality || "—"

    const caption = `
⭒ ִֶָ७ ꯭🎬˙⋆｡ - *𝚃𝒊́𝚝𝚞𝚕𝚘:* ${title}
⭒ ִֶָ७ ꯭📺˙⋆｡ - *𝘾𝙖𝙡𝙞𝙙𝙖𝙙:* ${quality}
`.trim()

    await conn.sendMessage(chatId, {
      video: { url: videoUrl },
      mimetype: "video/mp4",
      caption
    }, { quoted: msg })

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    })

  } catch (err) {

    await conn.sendMessage(chatId, {
      text: `❌ Error: ${err?.response?.status || ""} ${err?.message || "Fallo interno"}`
    }, { quoted: msg })

  }
}

handler.command = ["ytmp4", "yta4"]
handler.help    = ["ytmp4 <url>"]
handler.tags    = ["descargas"]

export default handler