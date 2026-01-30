// .ytmp3 usando https://ytdl.sylphy.xyz
import axios from "axios"
import yts from "yt-search"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args.join(" ").trim()
  if (!text) return m.reply(`Usa: ${usedPrefix + command} <nombre o link>`)


  try {
    let url = text
    let title = "audio"

    if (!/^https?:\/\//.test(text)) {
      const search = await yts(text)
      if (!search.videos.length) throw "No encontré resultados"
      url = search.videos[0].url
      title = search.videos[0].title
    }

    const api = `https://ytdl.sylphy.xyz/api/download?url=${encodeURIComponent(url)}&format=mp3`
    const { data } = await axios.get(api)

    if (!data?.url) throw "Error al convertir"

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: data.url },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      },
      { quoted: m }
    )

  } catch (e) {
    m.reply("Error al descargar el audio")
  }
}

handler.command = /^ytmp3$/i
export default handler