import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const handler = async (msg, { conn, args, usedPrefix, command }) => {

  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  if (!query) {
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>\nEj:\n${usedPrefix}${command} karma police`
    }, { quoted: msg })
  }

  await conn.sendMessage(chatId, {
    react: { text: "🎬", key: msg.key }
  })

  try {
    const search = await yts(query)
    if (!search?.videos?.length)
      throw new Error("No se encontraron resultados")

    const video = search.videos[0]

    const title    = video.title
    const author   = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const videoLink = video.url

    const caption = `
⭒ 🎬 *Título:* ${title}
⭒ 🎤 *Autor:* ${author}
⭒ 🕑 *Duración:* ${duration}
`.trim()

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url: videoLink,
        type: "mp4",
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    const result = res?.data?.result || {}
    const media  = result.media || {}

    const videoUrl =
      media.dl_download ||
      media.direct ||
      result.url ||
      result.direct ||
      result.dl

    if (!videoUrl)
      throw new Error("No se pudo obtener el video")

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
      text: `❌ Error: ${err?.message || "Fallo interno"}`
    }, { quoted: msg })
  }
}

handler.command = ["play2"]
handler.help    = ["play2 <texto>"]
handler.tags    = ["descargas"]

export default handler