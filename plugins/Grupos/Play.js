import axios from "axios"
import yts from "yt-search"

const API_KEY = "Angxlllll"
const API_URL = "https://api-adonix.ultraplus.click" // 🔴 CAMBIA SOLO ESTO

const handler = async (msg, { conn, args, usedPrefix, command }) => {

  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  if (!query)
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\nEj:\n${usedPrefix}${command} Karma Police`
    }, { quoted: msg })

  conn.sendMessage(chatId, { react: { text: "🕒", key: msg.key } }).catch(() => {})

  try {
    /* 🔍 BÚSQUEDA (ligera) */
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) throw "No se encontró ningún resultado"

    const link = video.url
    const thumb = video.thumbnail

    /* 🎧 LLAMADA ÚNICA A LA API */
    const res = await axios.get(API_URL, {
      params: {
        url: link,
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 25000
    })

    const data = res?.data

    if (
      !data?.estado ||
      !data?.datos?.url ||
      !data.datos.url.startsWith("http")
    ) throw "La API no devolvió un audio válido"

    const title = data.datos.título || video.title
    const duration = data.datos.duración || "Desconocida"

    /* 🖼️ INFO */
    await conn.sendMessage(chatId, {
      image: { url: thumb },
      caption: `
⭒ 🎵 *Título:* ${title}
⭒ 🕑 *Duración:* ${duration}

» Enviando audio 🎧
`.trim()
    }, { quoted: msg })

    /* ▶️ AUDIO DIRECTO */
    await conn.sendMessage(chatId, {
      audio: { url: data.datos.url },
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`,
      ptt: false
    }, { quoted: msg })

    conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {})

  } catch (e) {
    conn.sendMessage(chatId, {
      text: `❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`
    }, { quoted: msg })
  }
}

handler.command = ["play", "ytplay"]
handler.help = ["play <texto>"]
handler.tags = ["descargas"]

export default handler