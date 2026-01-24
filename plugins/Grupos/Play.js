import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const handler = async (m, { conn, args, usedPrefix, command }) => {

  const chatId = m.
  const query = args.join(" ").trim(


  if (!query)
    return m.reply(
      `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\nEj:\n${usedPrefix}${command} no surprises`
    )

  try {
    await m.react?.("🕒")

    const search = await yts(query)
    const video = search?.vios?.[0]


    if (!video) throw "No se encontró ningún resultado"

    await conn.sendMessage(chatId, {
      image: { url: video.thumbnail },
      caption: `
🎵 *${video.title}*
🎤 ${video.author?.name || "Desconocido"}
🕒 ${video.timestamp || "?"}
`.trim()
    }, { quoted: m })

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url: video.url,
        type: "Mp3",
        apikey: API_KEY
      },
      timeout: 20000
    })

    const audioUrl = res?.data?.result?.url
    if (!audioUrl) throw "La API no devolvió audio"

    await conn.sendMessage(chatId, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${video.title}.mp3`
    }, { quoted: m })

    await m.react?.("✅")

  } catch (e) {
    await m.reply(`❌ Error: ${e}`)
  }
}

handler.command = ["play", "ytplay"]
handler.tags = ["descargas"]
handler.help = ["play <texto>"]
