import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const handler = async (m, { conn, args, usedPrefix, command }) => {

  const query = args.join(" ").trim()

  if (!query)
    return m.reply(
      `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\nEj:\n${usedPrefix}${command} no surprises`
    )

  conn.sendMessage(m.chat, {
    react: { text: "🕒", key: m.key }
  }).catch(() => {})

  try {
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) throw "No se encontró ningún resultado"

    const title    = video.title
    const author   = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const thumb    = video.thumbnail || "https://i.ibb.co/3vhYnV0/default.jpg"
    const link     = video.url

    await conn.sendMessage(
      m.chat,
      {
        image: { url: thumb },
        caption: `
⭒ ִֶָ७ ꯭🎵˙⋆｡ - *Título:* ${title}
⭒ ִֶָ७ ꯭🎤˙⋆｡ - *Artista:* ${author}
⭒ ִֶָ७ ꯭🕑˙⋆｡ - *Duración:* ${duration}
        `.trim()
      },
      { quoted: m }
    )

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url: link,
        type: "Mp3",
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    const data = res?.data
    const audioUrl = data?.result?.url

    if (
      !data?.status ||
      !audioUrl ||
      typeof audioUrl !== "string" ||
      !audioUrl.startsWith("http")
    ) throw "La API no devolvió un audio válido"

    const cleanTitle = (data.result.title || title).replace(/\.mp3$/i, "")

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

    conn.sendMessage(m.chat, {
      react: { text: "✅", key: m.key }
    }).catch(() => {})

  } catch (e) {
    m.reply(`❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`)
  }
}

handler.command = ["play", "ytplay"]
handler.help = ["play <texto>"]
handler.tags = ["descargas"]

export default handler