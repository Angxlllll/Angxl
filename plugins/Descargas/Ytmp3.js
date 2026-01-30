import axios from "axios"
import yts from "yt-search"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args.join(" ").trim()
  if (!text) return m.reply(`Uso: ${usedPrefix + command} <link o nombre>`)


  try {
    let url = text
    let title = "audio"

    if (!/^https?:\/\//.test(text)) {
      const search = await yts(text)
      if (!search.videos.length) throw "Sin resultados"
      url = search.videos[0].url
      title = search.videos[0].title
    }

    // 1️⃣ convertir
    const convert = await axios.post(
      "https://ytdl.sylphy.xyz/api/convert",
      {
        url,
        format: "mp3",
        quality: 128
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    )

    const id = convert.data?.id
    if (!id) throw "No se pudo convertir"

    // 2️⃣ obtener link final
    const dl = `https://ytdl.sylphy.xyz/api/download/${id}`

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: dl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    m.reply("Error al descargar el audio")
  }
}

handler.command = /^ytmp3$/i
export default handler