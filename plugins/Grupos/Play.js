import axios from "axios"
import yts from "yt-search"

const API_KEY = "Angxlllll"
const API_URL = "https://api-adonix.ultraplus.click/ytmp3"

const handler = async (msg, { conn, args, usedPrefix, command }) => {

  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  if (!query)
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\nEj:\n${usedPrefix}${command} Karma Police`
    }, { quoted: msg })

  await conn.sendMessage(chatId, { react: { text: "🕒", key: msg.key } }).catch(() => {})

  try {
    /* 🔍 BUSCAR (ligero y rápido) */
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) throw "No se encontró ningún resultado"

    const videoUrl = video.url

    /* 🎧 API (URL → MP3) */
    const res = await axios.get(API_URL, {
      params: {
        url: videoUrl,   // ✅ ESTO era lo que faltaba
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 30000
    })

    const data = res?.data

    if (
      !data?.estado ||
      !data?.datos?.url ||
      !data.datos.url.startsWith("http")
    ) throw "La API no devolvió un audio válido"

    const title = data.datos.título || video.title
    const duration = data.datos.duración || video.timestamp

    /* 🖼️ INFO */
    await conn.sendMessage(chatId, {
      image: { url: video.thumbnail },
      caption: `
⭒ 🎵 *Título:* ${title}
⭒ 🕑 *Duración:* ${duration}

» Enviando audio 🎧
`.trim()
    }, { quoted: msg })

    /* ▶️ AUDIO */
    await conn.sendMessage(chatId, {
      audio: { url: data.datos.url },
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`
    }, { quoted: msg })

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {})

  } catch (e) {
    await conn.sendMessage(chatId, {
      text: `❌ Error: ${typeof e === "string" ? e : "Fallo de la API"}`
    }, { quoted: msg })
  }
}

handler.command = ["play", "ytplay"]
handler.help = ["play <texto>"]
handler.tags = ["descargas"]

export default handler