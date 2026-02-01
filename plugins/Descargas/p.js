import axios from "axios"

async function ytsyl(url, type = "audio", quality) {
  if (!url) throw new Error("URL inválida")

  quality ||= type === "audio" ? "128k" : "720p"

  const endpoint =
    type === "audio"
      ? "https://ytdl.sylphy.xyz/api/download/mp3"
      : "https://ytdl.sylphy.xyz/api/download/mp4"

  const { data } = await axios.post(
    endpoint,
    { url, quality, mode: "url" },
    { headers: { "content-type": "application/json" }, timeout: 15000 }
  )

  if (!data?.dl_url) throw new Error("Descarga fallida")

  return {
    title: data.title,
    author: data.author,
    duration: data.duration,
    thumbnail: data.thumbnail,
    size: data.filesize,
    url: data.dl_url
  }
}

const handler = async (m, { conn, args, command }) => {
  const url = args[0]

  if (!url)
    return m.reply(
      "Uso:\n" +
      "• .ytmp3 <link>\n" +
      "• .ytmp4 <link>"
    )

  try {
    const isVideo = command === "ytmp4" || command === "mp4"

    const res = await ytsyl(url, isVideo ? "video" : "audio")

    if (res.thumbnail) {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: res.thumbnail },
          caption:
            `🎵 ${res.title}\n` +
            `👤 ${res.author}\n` +
            `⏱ ${res.duration}\n` +
            `📦 ${res.size}`
        },
        { quoted: m }
      )
    }

    await conn.sendMessage(
      m.chat,
      isVideo
        ? { video: { url: res.url }, mimetype: "video/mp4" }
        : { audio: { url: res.url }, mimetype: "audio/mpeg" },
      { quoted: m }
    )
  } catch (e) {
    console.error("[ytmp]", e)
    m.reply("Error al descargar el contenido")
  }
}

handler.command = ["ytmp3", "ytmp4", "mp3", "mp4"]
export default handler