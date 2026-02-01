import axios from "axios"

/* =======================
   FUNCIÓN YTSYL (API)
======================= */
async function ytsyl(url, type = "audio", quality) {
  if (!url) throw new Error("URL requerida")

  const isAudio = type === "audio"
  quality ||= isAudio ? "128k" : "720p"

  const endpoint = isAudio
    ? "https://ytdl.sylphy.xyz/api/download/mp3"
    : "https://ytdl.sylphy.xyz/api/download/mp4"

  const { data } = await axios.post(
    endpoint,
    { url, quality, mode: "url" },
    {
      headers: { "content-type": "application/json" },
      timeout: 20000
    }
  )

  if (!data || !data.dl_url)
    throw new Error(data?.message || "Respuesta inválida")

  return {
    title: data.title,
    author: data.author,
    duration: data.duration,
    thumbnail: data.thumbnail,
    filesize: data.filesize,
    quality: data.quality,
    format: data.format,
    dl: data.dl_url
  }
}

/* =======================
   HANDLER (TU CORE)
======================= */
const handler = async (m, { conn, args, command }) => {
  const url = args[0]

  if (!url)
    return m.reply(
      "Uso:\n" +
      ".ytmp3 <link>\n" +
      ".ytmp4 <link>"
    )

  if (!/^https?:\/\//.test(url))
    return m.reply("❌ El enlace no es válido")

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
            `🎚 ${res.quality}\n` +
            `📦 ${res.filesize}`
        },
        { quoted: m }
      )
    }

    await conn.sendMessage(
      m.chat,
      isVideo
        ? { video: { url: res.dl }, mimetype: "video/mp4" }
        : { audio: { url: res.dl }, mimetype: "audio/mpeg" },
      { quoted: m }
    )
  } catch (e) {
    console.error("[ytsyl]", e?.response?.data || e.message)
    m.reply("❌ Error al descargar el contenido")
  }
}

handler.command = ["ytmp3", "ytmp4", "mp3", "mp4"]
export default handler