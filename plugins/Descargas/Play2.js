import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY = global.APIKeys?.may || ""

const tmpDir = path.join(process.cwd(), "tmp")
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

function cleanTmpDir() {
  if (!fs.existsSync(tmpDir)) return
  for (const file of fs.readdirSync(tmpDir)) {
    const full = path.join(tmpDir, file)
    try {
      if (fs.statSync(full).isFile()) fs.unlinkSync(full)
    } catch {}
  }
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const chatId = m.key.remoteJid
  const query = args.join(" ").trim()

  cleanTmpDir()

  if (!query) {
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>\nEj:\n${usedPrefix}${command} suiza`
    }, { quoted: m })
  }

  await conn.sendMessage(chatId, { react: { text: "🎬", key: m.key } })

  try {
    const search = await yts(query)
    if (!search?.videos?.length) throw "No se encontraron resultados"

    const video = search.videos[0]

    if (video.seconds > 480) {
      return conn.sendMessage(chatId, {
        text: "❌ Video demasiado largo (máx 8 minutos)"
      }, { quoted: m })
    }

    const title = video.title
    const author = video.author?.name || "Desconocido"
    const duration = video.timestamp || "Desconocida"
    const videoLink = video.url

    const caption = `
⭒ ִֶָ७ ꯭🎬˙⋆｡ - *𝚃𝚒́𝚝𝚞𝚕𝚘:* ${title}
⭒ ִֶָ७ ꯭🎤˙⋆｡ - *𝙰𝚞𝚝𝚘𝚛:* ${author}
⭒ ִֶָ७ ꯭🕑˙⋆｡ - *𝙳𝚞𝚛𝚊𝚌𝚒ó𝚗:* ${duration}
`.trim()

    const apiRes = await axios.get(`${API_BASE}/ytdl`, {
      params: { url: videoLink, type: "Mp4", apikey: API_KEY },
      timeout: 20000
    })

    if (!apiRes?.data?.result?.url) throw "La API no devolvió el link del video"

    const videoDownload = await axios.get(apiRes.data.result.url, {
      responseType: "arraybuffer",
      timeout: 30000
    })

    const videoPath = path.join(tmpDir, `${Date.now()}.mp4`)
    fs.writeFileSync(videoPath, videoDownload.data)

    await conn.sendMessage(chatId, {
      video: fs.readFileSync(videoPath),
      caption,
      mimetype: "video/mp4"
    }, { quoted: m })

    await conn.sendMessage(chatId, { react: { text: "✅", key: m.key } })

    cleanTmpDir()
  } catch (e) {
    cleanTmpDir()
    await conn.sendMessage(chatId, {
      text: `❌ Error: ${e?.message || e}`
    }, { quoted: m })
  }
}

handler.command = ["play2"]
handler.help = ["𝖯𝗅𝖺𝗒2 <𝖳𝖾𝗑𝗍𝗈>"]
handler.tags = ["𝖣𝖤𝖲𝖢𝖠𝖱𝖦𝖠𝖲"]
export default handler