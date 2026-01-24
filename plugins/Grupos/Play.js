import axios from "axios"

const API_KEY = "Angxlllll"
const API_URL = "https://api-adonix.ultraplus.click/ytmp3" // ✅ endpoint real

const handler = async (msg, { conn, args, usedPrefix, command }) => {

  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  if (!query)
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\nEj:\n${usedPrefix}${command} Karma Police`
    }, { quoted: msg })

  await conn.sendMessage(chatId, { react: { text: "🕒", key: msg.key } }).catch(() => {})

  try {
    /* 🎧 UNA SOLA LLAMADA (API TOTAL) */
    const res = await axios.get(API_URL, {
      params: {
        q: query,        // 🔑 la API busca por texto
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
    ) throw "Respuesta inválida de la API"

    const title = data.datos.título || query
    const duration = data.datos.duración || "Desconocida"

    /* 🖼️ INFO */
    await conn.sendMessage(chatId, {
      text: `
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