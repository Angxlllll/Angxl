import axios from "axios"

const API_URL = "https://api-adonix.ultraplus.click/download/ytaudio"
const API_KEY = "Angxlllll"

function isYouTube(url = "") {
  return /^https?:\/\//i.test(url) &&
    /(youtube\.com|youtu\.be|music\.youtube\.com)/i.test(url)
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args.join(" ").trim()

  if (!url)
    return m.reply(`✳️ Usa:\n${usedPrefix}${command} <url de YouTube>`)

  if (!isYouTube(url))
    return m.reply("❌ URL de YouTube inválida.")

  await conn.sendMessage(m.chat, {
    react: { text: "🕘", key: m.key }
  })

  try {
    const { data } = await axios.get(API_URL, {
      params: {
        url,
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    const result = data?.data || data?.datos
    if (!result) throw 0

    const audioUrl = result.url
    if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) throw 0

    const title = result.title || "Audio"
    const channel = result.author || "YouTube"
    const thumbnail = result.thumbnail

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: `
✧━───『 𝙄𝙣𝙛𝙤 𝙙𝙚𝙡 𝘼𝙪𝙙𝙞𝙤 』───━✧

🎼 Título: ${title}
📺 Canal: ${channel}

» Enviando audio 🎧
`.trim()
    }, { quoted: m })

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: title.replace(/[\\/:*?"<>|]/g, "").substring(0, 60) + ".mp3",
      ptt: false
    }, { quoted: m })

    await conn.sendMessage(m.chat, {
      react: { text: "✅", key: m.key }
    })

  } catch {
    await m.reply("❌ Error al obtener el audio.")
  }
}

handler.command = ["ytmp3"]
handler.tags = ["descargas"]
handler.help = ["ytmp3 <url>"]

export default handler