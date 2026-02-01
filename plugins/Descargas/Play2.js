"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY = global.APIKeys?.may || ""

const MAX_MB = 200
const TIMEOUT_MS = 60000

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

async function downloadToFile(url, filePath) {
  const headers = { Accept: "*/*" }
  try {
    if (new URL(url).host === new URL(API_BASE).host) headers.apikey = API_KEY
  } catch {}
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    headers,
    validateStatus: () => true
  })
  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)
  await streamPipe(res.data, fs.createWriteStream(filePath))
}

async function sendFast(conn, msg, video, caption) {
  const res = await axios.get(`${API_BASE}/ytdl`, {
    params: { url: video.url, type: "mp4", apikey: API_KEY },
    timeout: 20000
  })
  if (!res?.data?.status || !res.data.result?.url) throw new Error("Fast failed")
  await conn.sendMessage(
    msg.chat,
    {
      video: { url: res.data.result.url },
      mimetype: "video/mp4",
      caption
    },
    { quoted: msg }
  )
}

async function sendSafe(conn, msg, video, caption) {
  const res = await axios.get(`${API_BASE}/ytdl`, {
    params: { url: video.url, type: "mp4", apikey: API_KEY },
    timeout: 20000
  })
  if (!res?.data?.status || !res.data.result?.url) throw new Error("Safe failed")

  const dl = res.data.result.url
  const tmp = ensureTmp()
  const filePath = path.join(tmp, `${Date.now()}.mp4`)

  await downloadToFile(dl, filePath)

  const size = fs.statSync(filePath).size
  if (size / 1024 / 1024 > MAX_MB) {
    fs.unlinkSync(filePath)
    throw new Error("Video demasiado grande")
  }

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