import yts from "yt-search"
import axios from "axios"

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply("🎶 Ingresa el nombre del video de YouTube.")

  await m.react("🕘")

  try {
    let url = text
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "No disponible"
    let thumbnail = ""

    if (!text.startsWith("http")) {
      const res = await yts(text)
      if (!res?.videos?.length) return m.reply("🚫 No encontré resultados.")
      const video = res.videos[0]
      title = video.title
      authorName = video.author?.name || "Desconocido"
      durationTimestamp = video.timestamp || "?"
      views = video.views || "?"
      url = video.url
      thumbnail = video.thumbnail
    }

    const vistas = formatViews(views)

    const img = thumbnail
      ? (await axios.get(thumbnail, { responseType: "arraybuffer" })).data
      : null

    const caption = `
✧━───『 𝙄𝙣𝙛𝙤 𝙙𝙚𝙡 𝙑𝙞𝙙𝙚𝙤 』───━✧

🎼 Título: ${title}
📺 Canal: ${authorName}
👁️ Vistas: ${vistas}
⏳ Duración: ${durationTimestamp}
🌐 Enlace: ${url}

⚡ Shadow Bot ⚡
`

    if (img) {
      await conn.sendMessage(
        m.chat,
        { image: img, caption },
        { quoted: m }
      )
    } else {
      await m.reply(caption)
    }

    await downloadMp3(conn, m, url)

    await m.react("✅")
  } catch (e) {
    await m.reply("❌ Error: " + e.message)
    await m.react("⚠️")
  }
}

const downloadMp3 = async (conn, m, url) => {
  const sent = await conn.sendMessage(
    m.chat,
    { text: "🎵 Descargando audio..." },
    { quoted: m }
  )

  const apiUrl = `https://api-adonix.ultraplus.click/download/ytaudio?url=${encodeURIComponent(url)}&apikey=SHADOWBOTKEYMD`

  const { data } = await axios.get(apiUrl)

  if (!data?.status || !data?.data?.url) {
    return conn.sendMessage(
      m.chat,
      { text: "🚫 No se pudo descargar el audio.", edit: sent.key }
    )
  }

  const fileUrl = data.data.url
  const fileTitle = cleanName(data.data.title || "audio")

  await conn.sendMessage(
    m.chat,
    {
      audio: { url: fileUrl },
      mimetype: "audio/mpeg",
      fileName: fileTitle + ".mp3",
      ptt: true
    },
    { quoted: m }
  )

  await conn.sendMessage(
    m.chat,
    { text: "✅ Audio enviado", edit: sent.key }
  )
}

const cleanName = (name) =>
  name.replace(/[^\w\s.-]/gi, "").substring(0, 60)

const formatViews = (views) => {
  if (typeof views !== "number") return views
  if (views >= 1e9) return (views / 1e9).toFixed(1) + "B"
  if (views >= 1e6) return (views / 1e6).toFixed(1) + "M"
  if (views >= 1e3) return (views / 1e3).toFixed(1) + "K"
  return views.toString()
}

handler.command = ["play", "yt", "mp3"]
handler.tags = ["descargas"]
handler.register = true

export default handler