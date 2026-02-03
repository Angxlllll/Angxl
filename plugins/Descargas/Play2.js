"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import { promisify } from "util"
import { pipeline } from "stream"

const streamPipe = promisify(pipeline)

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Angxll"

const MAX_MB = 200
const TIMEOUT_MS = 60000
const STREAM_TIMEOUT = 300000

function ensureTmp() {
  const tmp = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

function isSkyUrl(url = "") {
  try { return new URL(url).host === new URL(API_BASE_ENV).host } 
  catch { return false }
}

async function downloadToTmp(url, filePath) {
  const headers = isSkyUrl(url) ? { apikey: API_KEY_ENV } : {}
  const res = await axios.get(url, { responseType: "stream", timeout: STREAM_TIMEOUT, headers, validateStatus: () => true })
  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)

  const write = fs.createWriteStream(filePath)
  let size = 0
  let aborted = false

  res.data.on("data", chunk => {
    size += chunk.length
    if (size / 1024 / 1024 > MAX_MB) {
      aborted = true
      res.data.destroy()
      write.destroy()
      fs.existsSync(filePath) && fs.unlinkSync(filePath)
    }
  })

  await new Promise((resolve, reject) => { write.on("finish", resolve); write.on("error", reject); res.data.pipe(write) })
  if (aborted) throw new Error("Video demasiado grande")
  return { filePath, size }
}

async function sendVideoTmp(conn, msg, filePath, size, caption) {
  await conn.sendMessage(msg.chat, { video: { stream: fs.createReadStream(filePath), length: size }, mimetype: "video/mp4", caption }, { quoted: msg })
  fs.existsSync(filePath) && fs.unlinkSync(filePath)
}

async function fastDownload(video) {
  const res = await axios.get(`${API_BASE_GLOBAL}/ytdl`, { params: { url: video.url, type: "mp4", apikey: API_KEY_GLOBAL }, timeout: 20000 })
  if (!res?.data?.status || !res.data.result?.url) throw new Error("Fast failed")
  const tmp = ensureTmp()
  const filePath = path.join(tmp, `${Date.now()}_fast.mp4`)
  const downloadPromise = downloadToTmp(res.data.result.url, filePath)
  return { downloadPromise, filePath }
}

async function safeDownload(video) {
  const r = await axios.post(`${API_BASE_ENV}/youtube/resolve`, { url: video.url, type: "video" }, { headers: { apikey: API_KEY_ENV }, validateStatus: () => true })
  const data = r.data
  if (!data?.result?.media) throw new Error("Safe failed")
  let dl = data.result.media.dl_download || data.result.media.direct
  if (!dl) throw new Error("No media url")
  if (dl.startsWith("/")) dl = API_BASE_ENV + dl
  const tmp = ensureTmp()
  const filePath = path.join(tmp, `${Date.now()}_safe.mp4`)
  const downloadPromise = downloadToTmp(dl, filePath)
  return { downloadPromise, filePath }
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()
  if (!query) return conn.sendMessage(msg.chat, { text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>` }, { quoted: msg })

  await conn.sendMessage(msg.chat, { react: { text: "🎬", key: msg.key } })

  let finished = false
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => { if (!finished) reject(new Error("Tiempo de espera agotado")) }, TIMEOUT_MS))

  try {
    await Promise.race([
      (async () => {
        const search = await yts(query)
        const video = search.videos?.[0]
        if (!video) throw new Error("Sin resultados")
        const caption = `🎬 *${video.title}*\n🎥 ${video.author?.name || "—"}\n⏱ ${video.timestamp || "--:--"}`

        const fast = fastDownload(video).catch(() => null)
        const safe = safeDownload(video).catch(() => null)

        const results = await Promise.race([fast, safe])
        if (!results) throw new Error("Ambos Fast y Safe fallaron")

        try {
          const { filePath, size } = await results.downloadPromise
          await sendVideoTmp(conn, msg, filePath, size, caption)
          finished = true
        } catch { throw new Error("Error al enviar el video") }
      })(),
      timeoutPromise
    ])
  } catch (err) {
    await conn.sendMessage(msg.chat, { text: `❌ Error: ${err?.message || "Fallo interno"}` }, { quoted: msg })
  }
}

handler.command = ["play2"]
handler.help = ["play2 <texto>"]
handler.tags = ["descargas"]

export default handler