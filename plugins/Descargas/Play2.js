import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import os from "os"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

function cleanTempDirs() {
  const dirs = new Set([
    os.tmpdir(),
    "/tmp",
    "/var/tmp",
    "./tmp",
    "./media",
    "./.cache",
    "./.npm"
  ])

  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file)
      try {
        if (fs.statSync(full).isFile()) {
          fs.unlinkSync(full)
        }
      } catch {}
    }
  }
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  cleanTempDirs()

  if (!query)
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>\nEj:\n${usedPrefix}${command} karma police`
    }, { quoted: msg })

  await conn.sendMessage(chatId, {
    react: { text: "🎬", key: msg.key }
  })

  try {
    const search = await yts(query)
    if (!search?.videos?.length)
      throw new Error("No se encontraron resultados")

    const video = search.videos[0]

    const title     = video.title
    const author    = video.author?.name || "Desconocido"
    const duration  = video.timestamp || "Desconocida"
    const videoLink = video.url

    const caption = `
⭒ ִֶָ७ ꯭🎬˙⋆｡ - *𝚃𝚒́𝚝𝚞𝚕𝚘:* ${title}
⭒ ִֶָ७ ꯭🎤˙⋆｡ - *𝙰𝚞𝚝𝚘𝚛:* ${author}
⭒ ִֶָ७ ꯭🕑˙⋆｡ - *𝙳𝚞𝚛𝚊𝚌𝚒ó𝚗:* ${duration}
`.trim()

    if (video.seconds > 480) {
      return conn.sendMessage(chatId, {
        text: "❌ Video demasiado largo (máx 8 minutos)"
      }, { quoted: msg })
    }

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url: videoLink,
        type: "Mp4",
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    if (!res?.data?.status || !res.data.result?.url)
      throw new Error("La API no devolvió el video")

    const videoUrl = res.data.result.url

    await conn.sendMessage(chatId, {
      video: { url: videoUrl },
      caption,
      mimetype: "video/mp4"
    }, { quoted: msg })

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    })

    cleanTempDirs()
  } catch (err) {
    cleanTempDirs()
    await conn.sendMessage(chatId, {
      text: `❌ Error: ${err?.message || "Fallo interno"}`
    }, { quoted: msg })
  }
}

handler.command = ["play2"]
handler.help = ["𝖯𝗅𝖺𝗒2 <𝖳𝖾𝗑𝗍𝗈>"]
handler.tags = ["𝖣𝖤𝖲𝖢𝖠𝖱𝖦𝖠𝖲"]
export default handler