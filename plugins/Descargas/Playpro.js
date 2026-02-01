"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { promisify } from "util"
import { pipeline } from "stream"

const streamPipe = promisify(pipeline)

const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY = process.env.API_KEY || "Russellxz"

const DEFAULT_VIDEO_QUALITY = "360"
const DEFAULT_AUDIO_FORMAT = "mp3"
const MAX_MB = 200

const VALID_QUALITIES = new Set(["144", "240", "360", "720", "1080", "1440", "4k"])

const pending = {}

function safeName(name = "file") {
  return String(name)
    .slice(0, 90)
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "file"
}

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024)
}

function ensureTmp() {
  const tmp = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

function extractQualityFromText(input = "") {
  const t = String(input).toLowerCase()
  if (t.includes("4k")) return "4k"
  const m = t.match(/\b(144|240|360|720|1080|1440)\b/)
  return m?.[1] || ""
}

function splitQueryAndQuality(text = "") {
  const parts = text.trim().split(/\s+/)
  const last = parts.at(-1)?.toLowerCase()
  if (VALID_QUALITIES.has(last)) {
    parts.pop()
    return { query: parts.join(" "), quality: last }
  }
  return { query: text.trim(), quality: "" }
}

function isApiUrl(url = "") {
  try {
    return new URL(url).host === new URL(API_BASE).host
  } catch {
    return false
  }
}

async function downloadToFile(url, filePath) {
  const headers = { Accept: "*/*" }
  if (isApiUrl(url)) headers.apikey = API_KEY

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    headers,
    validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)
  await streamPipe(res.data, fs.createWriteStream(filePath))
}

async function callYoutubeResolve(videoUrl, { type, quality, format }) {
  const body =
    type === "video"
      ? { url: videoUrl, type: "video", quality }
      : { url: videoUrl, type: "audio", format }

  const r = await axios.post(`${API_BASE}/youtube/resolve`, body, {
    headers: { apikey: API_KEY },
    validateStatus: () => true
  })

  const data = r.data
  if (!data?.result?.media) throw new Error("API error")

  let dl = data.result.media.dl_download || ""
  if (dl.startsWith("/")) dl = API_BASE + dl

  return {
    title: data.result.title,
    thumbnail: data.result.thumbnail,
    dl: dl || data.result.media.direct
  }
}

const handler = async (m, { conn }) => {
  const text = m.text?.trim()
  const { query, quality } = splitQueryAndQuality(text)

  if (!query) return m.reply("✳️ Usa: .playa <texto> [calidad]")

    await conn.sendMessage(m.chat, {
    react: { text: "⏳", key: m.key }
  })

  const res = await yts(query)
  const video = res.videos?.[0]
  if (!video) return m.reply("❌ Sin resultados")

  const q = VALID_QUALITIES.has(quality) ? quality : DEFAULT_VIDEO_QUALITY

  const caption = `

🎬 ${video.title}
⏱ ${video.timestamp}
👁 ${video.views.toLocaleString()}
🎥 ${video.author.name}

Opciones:
👍 Audio
❤️ Video (${q}p)
📄 Audio Doc
📁 Video Doc`

  const preview = await conn.sendMessage(
    m.chat,
    { image: { url: video.thumbnail }, caption },
    { quoted: m }
  )

  pending[preview.key.id] = {
    chat: m.chat,
    url: video.url,
    title: video.title,
    quality: q,
    quoted: m
  }

    await conn.sendMessage(m.chat, {
    react: { text: "✅", key: m.key }
  })

  if (conn._playListener) return
  conn._playListener = true

  conn.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      const react = msg.message?.reactionMessage
      if (!react) continue

      const job = pending[react.key.id]
      if (!job) continue

      if (react.text === "👍") await sendAudio(conn, job, false)
      if (react.text === "📄") await sendAudio(conn, job, true)
      if (react.text === "❤️") await sendVideo(conn, job, false)
      if (react.text === "📁") await sendVideo(conn, job, true)
    }
  })
}

async function sendAudio(conn, job, doc) {
  const { dl } = await callYoutubeResolve(job.url, { type: "audio", format: "mp3" })
  const tmp = ensureTmp()
  const file = path.join(tmp, `${Date.now()}.mp3`)
  await downloadToFile(dl, file)

  if (fileSizeMB(file) > MAX_MB) return

  await conn.sendMessage(job.chat, {
    [doc ? "document" : "audio"]: fs.readFileSync(file),
    mimetype: "audio/mpeg",
    fileName: `${safeName(job.title)}.mp3`
  }, { quoted: job.quoted })

  fs.unlinkSync(file)
}

async function sendVideo(conn, job, doc) {
  const { dl } = await callYoutubeResolve(job.url, { type: "video", quality: job.quality })
  const tmp = ensureTmp()
  const file = path.join(tmp, `${Date.now()}.mp4`)
  await downloadToFile(dl, file)

  if (fileSizeMB(file) > MAX_MB) return

  await conn.sendMessage(job.chat, {
    [doc ? "document" : "video"]: fs.readFileSync(file),
    mimetype: "video/mp4",
    fileName: `${safeName(job.title)}_${job.quality}p.mp4`,
    caption: `🎬 ${job.title}\n⚡ ${job.quality}p\n🤖`
  }, { quoted: job.quoted })

  fs.unlinkSync(file)
}

handler.command = ["playa", "ytplaya"]
handler.help = ["playa <texto>"]
handler.tags = ["descargas"]

export default handler