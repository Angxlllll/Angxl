import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const handler = async (m, { conn, args, usedPrefix, command }) => {

  console.log("🧪 [PLAY] handler ejecutado")
  console.log("🧪 [PLAY] texto:", JSON.stringify(m.text))
  console.log("🧪 [PLAY] usedPrefix:", usedPrefix)
  console.log("🧪 [PLAY] command:", command)
  console.log("🧪 [PLAY] args:", args)

  const query = args.join(" ").trim()
  console.log("🧪 [PLAY] query:", query)

  if (!query) {
    console.log("⛔ [PLAY] sin query, retorno")
    return m.reply(
      `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\nEj:\n${usedPrefix}${command} no surprises`
    )
  }

  conn.sendMessage(m.chat, {
    react: { text: "🕒", key: m.key }
  }).catch(() => {})

  try {
    console.log("🔍 [PLAY] buscando en YouTube...")
    const search = await yts(query)
    const video = search?.videos?.[0]

    if (!video) {
      console.log("❌ [PLAY] sin resultados")
      throw "No se encontró ningún resultado"
    }

    console.log("✅ [PLAY] video encontrado:", video.title)

    const title    = video.title
    const author   = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const thumb    = video.thumbnail
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

    console.log("⬇️ [PLAY] llamando API ytdl...")
    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url: link,
        type: "Mp3",
        apikey: API_KEY
      },
      timeout: 20000
    })

    console.log("📦 [PLAY] respuesta API:", res?.data)

    const data = res?.data
    const audioUrl = data?.result?.url

    if (!data?.status || !audioUrl) {
      console.log("❌ [PLAY] API inválida")
      throw "La API no devolvió un audio válido"
    }

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

    console.log("✅ [PLAY] audio enviado")

  } catch (e) {
    console.log("💥 [PLAY] error:", e)
    m.reply(`❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`)
  }
}

/* 👇 LOG TAMBIÉN AQUÍ */
handler.customPrefix = /^\.play(\s|$)/i
console.log("📦 [PLAY] plugin cargado")

handler.command = ["play", "ytplay"]
export default handler