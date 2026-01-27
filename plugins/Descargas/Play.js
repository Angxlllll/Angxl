import yts from "yt-search"
import axios from "axios"

const handler = async (m, { conn, args }) => {
  const query = args.join(" ").trim()
  if (!query) return m.reply("🎶 Ingresa el nombre del video de YouTube.")

  await m.react("🕘")

  try {
    let url = query
    let title = "Desconocido"
    let authorName = "Desconocido"
    let durationTimestamp = "Desconocida"
    let views = "No disponible"
    let thumbnail = ""

    if (!query.startsWith("http")) {
      const res = await yts(query)
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

    if (thumbnail) {
      const img = (
        await axios.get(thumbnail, { responseType: "arraybuffer" })
      ).data

      await conn.sendMessage(
        m.chat,
        { image: img, caption: buildCaption(title, authorName, vistas, durationTimestamp, url) },
        { quoted: m }
      )
    } else {
      await m.reply(
        buildCaption(title, authorName, vistas, durationTimestamp, url)
      )
    }

    await downloadMp3(conn, m, url)

    await m.react("✅")
  } catch (e) {
    console.error(e)
    await m.reply("❌ Error al procesar el audio.")
    await m.react("⚠️")
  }
}

const downloadMp3 = async (conn, m, url) => {
  const sent = await conn.sendMessage(
    m.chat,
    { text: "🎵 Descargando audio..." },
    { quoted: m }
  )

  const apiUrl = `https://api-adonix.ultraplus.click/download/ytaudio?url=${encodeURIComponent(
    url
  )}&apikey=SHADOWBOTKEYMD`

  const { data } = await axios.get(apiUrl)

  if (!data?.status || !data?.data?.url)
    return conn.sendMessage(
      m.chat,
      { text: "🚫 No se pudo descargar el audio.", edit: sent.key }
    )

  await conn.sendMessage(
    m.chat,
    {
      audio: { url: data.data.url },
      mimetype: "audio/mpeg",
      ptt: true,
      fileName: cleanName(data.data.title || "audio") + ".mp3"
    },
    { quoted: m }
  )

  await conn.sendMessage(
    m.chat,
    { text: "✅ Audio enviado", edit: sent.key }
  )
}

const buildCaption = (title, author, views, duration, url) => `
✧━───『 𝙄𝙣𝙛𝙤 𝙙𝙚𝙡 𝙑𝙞𝙙𝙚𝙤 』───━✧

🎼 Título: ${title}
📺 Canal: ${author}
👁️ Vistas: ${views}
⏳ Duración: ${duration}
🌐 Enlace: ${url}
`

const cleanName = name =>
  name.replace(/[^\w\s.-]/gi, "").substring(0, 60)

const formatViews = v => {
  if (typeof v !== "number") return v
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B"
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K"
  return v.toString()
}

handler.command = ["play", "yt", "mp3"]
handler.tags = ["descargas"]
handler.register = true

export default handler