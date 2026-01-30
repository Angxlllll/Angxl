import axios from "axios"
import yts from "yt-search"
import cheerio from "cheerio"

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args.join(" ").trim()
  if (!text) return m.reply(`Uso: ${usedPrefix + command} <link o nombre>`)


  try {
    let url = text
    let title = "audio"

    if (!/^https?:\/\//.test(text)) {
      const r = await yts(text)
      if (!r.videos.length) throw new Error("Sin resultados en YouTube")
      url = r.videos[0].url
      title = r.videos[0].title
    }

    // 1️⃣ POST real (formulario)
    const form = new URLSearchParams()
    form.append("url", url)
    form.append("format", "mp3")
    form.append("quality", "128")

    const res = await axios.post(
      "https://ytdl.sylphy.xyz/",
      form.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0"
        },
        maxRedirects: 0,
        validateStatus: s => s === 302 || s === 200
      }
    )

    // 2️⃣ detectar redirección
    const redirect = res.headers.location
    if (!redirect)
      throw new Error("No hubo redirección (bloqueo del servidor)")

    // 3️⃣ pedir HTML final
    const page = await axios.get(
      "https://ytdl.sylphy.xyz" + redirect,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    )

    const $ = cheerio.load(page.data)
    const link = $("a:contains('Download File')").attr("href")

    if (!link)
      throw new Error("No se encontró el enlace MP3")

    const finalUrl = link.startsWith("http")
      ? link
      : "https://ytdl.sylphy.xyz" + link

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
    m.reply(
      `⚠️ *FALLO EN YTMP3*\n\n` +
      `📌 Motivo:\n${e.message}\n\n` +
      `🧪 Tipo:\n${e.name}`
    )
    console.error(e)
  }
}

handler.command = /^ytmp3$/i
export default handler