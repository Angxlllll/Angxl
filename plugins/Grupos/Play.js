import yts from "yt-search"
import fetch from "node-fetch"

const API_KEY  = "SHADOWKEYBOTMD"
const API_BASE = "https://api-adonix.ultraplus.click"

const handler = async (m, { conn, args, usedPrefix, command }) => {

  const query = args.join(" ").trim()
  if (!query)
    return m.reply(`✳️ Usa:\n${usedPrefix}${command} <nombre de canción>`)


  try {
    /* 🔍 BÚSQUEDA */
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) throw "No encontré resultados"

    const {
      title,
      url,
      thumbnail,
      timestamp,
      author
    } = video

    /* 🖼 INFO */
    await conn.sendMessage(
      m.chat,
      {
        image: { url: thumbnail },
        caption: `
🎵 *Título:* ${title}
🎤 *Canal:* ${author?.name || "Desconocido"}
🕑 *Duración:* ${timestamp}

» Descargando audio 🎧
`.trim()
      },
      { quoted: m }
    )

    /* 🎧 DESCARGA (API REAL) */
    const apiUrl =
      `${API_BASE}/download/ytaudio?url=${encodeURIComponent(url)}&apikey=${API_KEY}`

    const res = await fetch(apiUrl)
    const data = await res.json()

    if (!data?.status || !data?.data?.url)
      throw "La API no devolvió el audio"

    const audioUrl = data.data.url
    const cleanTitle = cleanName(data.data.title || title)

    /* ▶️ AUDIO */
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: `${cleanTitle}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

  } catch (e) {
    m.reply(`❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`)
  }
}

const cleanName = (name) =>
  name.replace(/[^\w\s-_.]/gi, "").substring(0, 60)

handler.command = ["play"]
handler.help = ["play <texto>"]
handler.tags = ["descargas"]

export default handler