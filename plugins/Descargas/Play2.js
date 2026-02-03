"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Angxll"

const MAX_MB = 200
const TIMEOUT_MS = 60000

function ensureTmp() {
  const tmp = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

function isSkyUrl(url = "") {
  try {
    return new URL(url).host === new URL(API_BASE_ENV).host
  } catch {
    return false
  }
}

async function resolveSky(videoUrl) {
  const r = await axios.post(
    `${API_BASE_ENV}/youtube/resolve`,
    { url: videoUrl, type: "video" },
    {
      headers: { apikey: API_KEY_ENV },
      timeout: 20000,
      validateStatus: () => true
    }
  )

  const media = r?.data?.result?.media
  if (!media) throw new Error("Resolve failed")

  let dl = media.direct || media.dl_download
  if (!dl) throw new Error("No direct url")

  if (dl.startsWith("/")) dl = API_BASE_ENV + dl
  return dl
}

async function downloadToTmp(url) {
  const tmp = ensureTmp()
  const filePath = path.join(tmp, `${Date.now()}.mp4`)

  const headers = isSkyUrl(url) ? { apikey: API_KEY_ENV } : {}

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 0,
    headers,
    validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)

  let size = 0
  res.data.on("data", c => {
    size += c.length
    if (size / 1024 / 1024 > MAX_MB) {
      res.data.destroy()
    }
  })

  const write = fs.createWriteStream(filePath)
  await new Promise((resolve, reject) => {
    res.data.pipe(write)
    write.on("finish", resolve)
    write.on("error", reject)
    res.data.on("error", reject)
  })

  if (size / 1024 / 1024 > MAX_MB) {
    fs.existsSync(filePath) && fs.unlinkSync(filePath)
    throw new Error("Video demasiado grande")
  }

  return { filePath, size }
}

async function sendFast(conn, msg, video, caption) {
  const r = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
    params: {
      url: video.url,
      type: "mp4",
      apikey: API_KEY_GLOBAL
    },
    timeout: 20000
  })

  if (!r?.data?.status || !r.data.result?.url) throw new Error("Fast failed")

  await conn.sendMessage(
    msg.chat,
    {
      video: { url: r.data.result.url },
      mimetype: "video/mp4",
      caption
    },
    { quoted: msg }
  )
}

async function sendSafe(conn, msg, video, caption) {
  const directUrl = await resolveSky(video.url)
  const { filePath, size } = await downloadToTmp(directUrl)

  try {
    await conn.sendMessage(
      msg.chat,
      {
        video: {
          stream: fs.createReadStream(filePath),
          length: size
        },
        mimetype: "video/mp4",
        caption
      },
      { quoted: msg }
    )
  } finally {
    fs.existsSync(filePath) && fs.unlinkSync(filePath)
  }
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()

  if (!query) {
    return conn.sendMessage(
      msg.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>` },
      { quoted: msg }
    )
  }

  await conn.sendMessage(msg.chat, {
    react: { text: "🎬", key: msg.key }
  })

  let finished = false

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      if (!finished) reject(new Error("Tiempo de espera agotado"))
    }, TIMEOUT_MS)
  })

  try {
    await Promise.race([
      (async () => {
        const search = await yts(query)
        const video = search.videos?.[0]
        if (!video) throw new Error("Sin resultados")

        const caption = `
🎬 *${video.title}*
🎥 ${video.author?.name || "—"}
⏱ ${video.timestamp || "--:--"}
        `.trim()

        try {
          await sendFast(conn, msg, video, caption)
          finished = true
          return
        } catch {}

        await sendSafe(conn, msg, video, caption)
        finished = true
      })(),
      timeoutPromise
    ])
  } catch (err) {
    await conn.sendMessage(
      msg.chat,
      { text: `❌ Error: ${err?.message || "Fallo interno"}` },
      { quoted: msg }
    )
  }
}

handler.command = ["play2"]
handler.help = ["play2 <texto>"]
handler.tags = ["descargas"]

export default handler