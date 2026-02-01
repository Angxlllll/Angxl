import axios from "axios"

async function ytsyl(url, type = "audio", quality) {
  if (!url) throw new Error("URL inválida")

  if (!quality) {
    quality = type === "audio" ? "128k" : "720p"
  }

  const endpoint =
    type === "audio"
      ? "https://ytdl.sylphy.xyz/api/download/mp3"
      : "https://ytdl.sylphy.xyz/api/download/mp4"

  const { data } = await axios.post(
    endpoint,
    { url, quality, mode: "url" },
    { headers: { "content-type": "application/json" } }
  )

  if (!data?.dl_url) throw new Error("Descarga fallida")

  return {
    title: data.title,
    author: data.author,
    duration: data.duration,
    thumbnail: data.thumbnail,
    quality: data.quality,
    size: data.filesize,
    url: data.dl_url,
    type
  }
}

const handler = async (m, { conn, text, command }) => {
  if (!text)
    return m.reply(
      "📌 Uso:\n" +
      "• *.ytmp3 <link>*\n" +
      "• *.ytmp4 <link>*"
    )

  await m.react("🕓")

  try {
    const isVideo = ["ytmp4", "mp4"].includes(command)

    const res = await ytsyl(
      text,
      isVideo ? "video" : "audio"
    )

    if (res.thumbnail) {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: res.thumbnail },
          caption:
            `🎵 *${res.title}*\n` +
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
        ? {
            video: { url: res.url },
            caption: `🎬 ${res.title}`,
            mimetype: "video/mp4"
          }
        : {
            audio: { url: res.url },
            mimetype: "audio/mpeg",
            fileName: `${res.title}.mp3`
          },
      { quoted: m }
    )

    await m.react("✅")
  } catch (e) {
    await m.react("❌")
    m.reply("🚫 Error al procesar el enlace")
  }
}

handler.command = ["ytamp3", "ytamp4", "mp3", "mp4"]
export default handler