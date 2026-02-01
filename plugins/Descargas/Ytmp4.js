"use strict"

import axios from "axios"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Russellxz"

const MAX_MB = 200
const TIMEOUT_MS = 60000

function isYouTube(url = "") {
  return /^https?:\/\//i.test(url) &&
    /(youtube\.com|youtu\.be|music\.youtube\.com)/i.test(url)
}

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

async function downloadToFile(url, filePath) {
  const headers = { Accept: "*/*" }
  if (isSkyUrl(url)) headers.apikey = API_KEY_ENV

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    headers,
    validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)
  await streamPipe(res.data, fs.createWriteStream(filePath))
}

async function sendFast(conn, msg, videoUrl) {
  const res = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
    params: {
      url: videoUrl,
      type: "mp4",
      apikey: API_KEY_GLOBAL
    },
    timeout: 20000
  })

  if (!res?.data?.status || !res.data.result?.url)
    throw new Error("Fast failed")

  await conn.sendMessage(
    msg.chat,
    {
      video: { url: res.data.result.url },
      mimetype: "video/mp4"
    },
    { quoted: msg }
  )
}

async function sendSafe(conn, msg, videoUrl) {
  const r = await axios.post(
    `${API_BASE_ENV}/youtube/resolve`,
    {
      url: videoUrl,
      type: "video"
    },
    {
      headers: { apikey: API_KEY_ENV },
      validateStatus: () => true
    }
  )

  const data = r.data
  if (!data?.result?.media) throw new Error("Safe failed")

  let dl = data.result.media.dl_download || data.result.media.direct
  if (!dl) throw new Error("No media url")
  if (dl.startsWith("/")) dl = API_BASE_ENV + dl

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
        mimetype: "video/mp4"
      },
      { quoted: msg }
    )
  } finally {
    fs.existsSync(filePath) && fs.unlinkSync(filePath)
  }
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const url = args[0]?.trim()

  if (!url || !isYouTube(url)) {
    return conn.sendMessage(
      msg.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <link de YouTube>` },
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
        try {
          await sendFast(conn, msg, url)
          finished = true
          return
        } catch {}

        await sendSafe(conn, msg, url)
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

handler.command = ["ytmp4"]
handler.help = ["ytmp4"]
handler.tags = ["descargas"]

export default handler