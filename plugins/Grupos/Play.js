import axios from "axios"
import yts from "yt-search"

const SYLPHY_API = "https://sylphy.xyz/download/v2/ytmp3"
const API_KEY = "sylphy-c4e327"

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()
  if (!query) {
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <canción>`
    }, { quoted: msg })
  }

  try {
    const search = await yts(query)
    const video = search.videos[0]
    if (!video) throw 0

    await conn.sendMessage(chatId, {
      image: { url: video.thumbnail },
      caption: `
🎵 *${video.title}*
🎤 ${video.author?.name || "—"}
🕑 ${video.timestamp || "—"}
`.trim()
    }, { quoted: msg })

    const { data } = await axios.get(SYLPHY_API, {
      params: {
        url: video.url,
        api_key: API_KEY
      },
      timeout: 15000
    })

    const audioUrl = data?.result?.dl_url
    if (!audioUrl) throw 0

    await conn.sendMessage(chatId, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${video.title}.mp3`,
      ptt: false
    }, { quoted: msg })

  } catch {
    await conn.sendMessage(chatId, {
      text: "❌ Error al obtener el audio."
    }, { quoted: msg })
  }
}

handler.command = ["play"]
handler.tags = ["descargas"]
handler.help = ["play <texto>"]

export default handler