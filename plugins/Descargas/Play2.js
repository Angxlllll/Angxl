"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY  = process.env.API_KEY || "Russellxz"

const VIDEO_QUALITY = "360"
const MAX_MB = 200

function ensureTmp() {
  const tmp = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

function safeName(name = "video") {
  return String(name)
    .slice(0, 80)
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "video"
}

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024)
}

async function downloadToFile(url, filePath) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)
  await streamPipe(res.data, fs.createWriteStream(filePath))
}

async function resolveVideo(videoUrl) {
  const r = await axios.post(
    `${API_BASE}/youtube/resolve`,
    { url: videoUrl, type: "video", quality: VIDEO_QUALITY },
    { headers: { apikey: API_KEY }, validateStatus: () => true }
  )

  const media = r.data?.result?.media
  if (!media) throw new Error("API error")

  let dl = media.dl_download || media.direct
  if (dl?.startsWith("/")) dl = API_BASE + dl

  if (!dl) throw new Error("No se pudo obtener el video")
  return dl
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()

  if (!query)
    return conn.sendMessage(m.chat, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>\nEj:\n${usedPrefix}${command} karma police`
    }, { quoted: m })

  await conn.sendMessage(m.chat, {
    react: { text: "🎬", key: m.key }
  })

  try {
    const search = await yts(query)
    const video = search.videos?.[0]
    if (!video) throw new Error("Sin resultados")

    const caption = `
🎬 *${video.title}*
🎥 ${video.author?.name || "—"}
⏱ ${video.timestamp}
📺 ${VIDEO_QUALITY}p
`.trim()

    const videoUrl = await resolveVideo(video.url)

    const tmp = ensureTmp()
    const filePath = path.join(tmp, `${Date.now()}.mp4`)

    await downloadToFile(videoUrl, filePath)

    if (fileSizeMB(filePath) > MAX_MB) {
      fs.unlinkSync(filePath)
      throw new Error("El video es demasiado pesado")
    }

    try {
      await conn.sendMessage(m.chat, {
        video: fs.readFileSync(filePath),
        mimetype: "video/mp4",
        fileName: `${safeName(video.title)}_${VIDEO_QUALITY}p.mp4`,
        caption
      }, { quoted: m })
    } catch {
      await conn.sendMessage(m.chat, {
        document: fs.readFileSync(filePath),
        mimetype: "video/mp4",
        fileName: `${safeName(video.title)}_${VIDEO_QUALITY}p.mp4`,
        caption
      }, { quoted: m })
    }

    fs.unlinkSync(filePath)

  } catch (err) {
    await conn.sendMessage(m.chat, {
      text: `❌ Error: ${err?.message || "Fallo interno"}`
    }, { quoted: m })
  }
}

handler.command = ["play2"]
handler.help = ["play2 <texto>"]
handler.tags = ["descargas"]

export default handler