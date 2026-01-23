import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const handler = async (m, { conn, args, usedPrefix, command }) => {

  console.log("[PLAY] ejecutado:", m.text)

  const query = args.join(" ").trim()

  if (!query) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          `✳️ Usa:\n${usedPrefix}${command} <nombre de canción>\n` +
          `Ej:\n${usedPrefix}${command} no surprises`
      },
      { quoted: m }
    )
  }

  try {
    console.log("[PLAY] buscando:", query)
    const search = await yts(query)
    const video = search?.videos?.[0]

    if (!video)
      throw "No se encontró ningún resultado"

    await conn.sendMessage(
      m.chat,
      {
        image: { url: video.thumbnail },
        caption: `
⭒ ִֶָ७ ꯭🎵˙⋆｡ - *Título:* ${video.title}
⭒ ִֶָ७ ꯭🎤˙⋆｡ - *Artista:* ${video.author?.name || "Desconocido"}
⭒ ִֶָ७ ꯭🕑˙⋆｡ - *Duración:* ${video.timestamp || "Desconocida"}
        `.trim()
      },
      { quoted: m }
    )

    const res = await axios.get(
      `${API_BASE}/ytdl`,
      {
        params: {
          url: video.url,
          type: "Mp3",
          apikey: API_KEY
        },
        timeout: 20000
      }
    )

    const audioUrl = res?.data?.result?.url
    if (!audioUrl)
      throw "La API no devolvió audio"

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: `${video.title}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

  } catch (e) {
    console.log("[PLAY] error:", e)
    await conn.sendMessage(
      m.chat,
      {
        text: `❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`
      },
      { quoted: m }
    )
  }
}

handler.command = ["play"]
handler.help = ["play <texto>"]
handler.tags = ["descargas"]

export default handler