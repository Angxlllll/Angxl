import yts from "yt-search"
import fetch from "node-fetch"

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply("❀ Ingresa el nombre o link del video de YouTube.")


  try {
    let url = text
    let title = "Desconocido"
    let thumbnail = ""

    // 🔎 Buscar si no es link
    if (!/^https?:\/\//i.test(text)) {
      const res = await yts(text)
      if (!res?.videos?.length) return m.reply("🚫 No encontré resultados.")
      const video = res.videos[0]
      title = video.title
      url = video.url
      thumbnail = video.thumbnail
    }

    // 📥 Descargar audio
    const apiUrl = `https://api-adonix.ultraplus.click/download/ytaudio?url=${encodeURIComponent(url)}&apikey=SHADOWKEYBOTMD`
    const r = await fetch(apiUrl)
    const json = await r.json()

    if (!json?.status || !json?.data?.url) {
      return m.reply("❌ No se pudo descargar el audio.")
    }

    const audioUrl = json.data.url
    const fileName = cleanName(json.data.title || title)

    // 🖼️ Miniatura (opcional)
    if (thumbnail) {
      const thumb = (await conn.getFile(thumbnail)).data
      await conn.sendMessage(
        m.chat,
        {
          image: thumb,
          caption: `🎵 *${fileName}*\n\n⬇️ Descargando audio...`
        },
        { quoted: m }
      )
    }

    // 🎧 Enviar audio
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: fileName + ".mp3"
      },
      { quoted: m }
    )


  } catch (e) {
    console.error(e)
    m.reply("❌ Error: " + e.message)
  }
}

handler.command = ["play", "ytaudio"]
handler.tags = ["descargas"]

export default handler

// 🧼 Limpia nombres de archivo
const cleanName = (name) =>
  name.replace(/[^\w\s.-]/gi, "").substring(0, 60)