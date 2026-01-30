import axios from "axios"
import yts from "yt-search"
import cheerio from "cheerio"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args.join(" ").trim()
  if (!text) return m.reply(`Uso: ${usedPrefix + command} <link o nombre>`)


  try {
    let url = text
    let title = "audio"

    // 🔎 búsqueda si no es link
    if (!/^https?:\/\//.test(text)) {
      const search = await yts(text)
      if (!search.videos.length)
        throw new Error("❌ No se encontraron resultados en YouTube")
      url = search.videos[0].url
      title = search.videos[0].title
    }

    // 📥 petición HTML
    const res = await axios.get(
      "https://ytdl.sylphy.xyz/download",
      {
        params: {
          url,
          format: "mp3",
          quality: 128
        },
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    )

    if (!res.data)
      throw new Error("❌ El servidor no devolvió HTML")

    // 🧠 parsear HTML
    const $ = cheerio.load(res.data)

    const downloadUrl =
      $("a:contains('Download File')").attr("href") ||
      $("a.btn-success").attr("href")

    if (!downloadUrl)
      throw new Error("❌ No se encontró el botón de descarga (HTML cambió)")

    const finalUrl = downloadUrl.startsWith("http")
      ? downloadUrl
      : "https://ytdl.sylphy.xyz" + downloadUrl

    // 🎧 enviar audio
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: finalUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      },
      { quoted: m }
    )


  } catch (e) {

    // 💥 ERROR REAL
    m.reply(
      `⚠️ *FALLO EN YTMP3*\n\n` +
      `📌 Motivo:\n${e.message || e}\n\n` +
      `🧪 Detalle técnico:\n${String(e).slice(0, 300)}`
    )

    console.error("YTMP3 ERROR:", e)
  }
}

handler.command = /^ytmp3$/i
export default handler