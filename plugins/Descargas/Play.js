"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import fetch from "node-fetch"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Angxll"

const MAX_MB = 200
const STREAM_TIMEOUT = 300000

global.playCache ||= new Map()

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

async function sendFastVideo(conn, m, video, caption) {
  if (!API_BASE_GLOBAL || !API_KEY_GLOBAL) throw "Fast no configurado"

  const res = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
    params: { url: video.url, type: "mp4", apikey: API_KEY_GLOBAL },
    timeout: 20000
  })

  if (!res?.data?.result?.url) throw "Fast falló"

  await conn.sendMessage(m.chat, {
    video: { url: res.data.result.url },
    mimetype: "video/mp4",
    caption
  }, { quoted: m })
}

async function sendSafeVideo(conn, m, video, caption) {
  const r = await axios.post(`${API_BASE_ENV}/youtube/resolve`,
    { url: video.url, type: "video" },
    { headers: { apikey: API_KEY_ENV } }
  )

  let dl = r.data?.result?.media?.dl_download || r.data?.result?.media?.direct
  if (!dl) throw "Safe falló"
  if (dl.startsWith("/")) dl = API_BASE_ENV + dl

  const headers = isSkyUrl(dl) ? { apikey: API_KEY_ENV } : {}
  const tmp = ensureTmp()
  const file = path.join(tmp, Date.now() + ".mp4")

  const res = await axios.get(dl, {
    responseType: "stream",
    timeout: STREAM_TIMEOUT,
    headers
  })

  let size = 0
  res.data.on("data", c => {
    size += c.length
    if (size / 1024 / 1024 > MAX_MB) throw "Video grande"
  })

  await streamPipe(res.data, fs.createWriteStream(file))

  await conn.sendMessage(m.chat, {
    video: fs.createReadStream(file),
    mimetype: "video/mp4",
    caption
  }, { quoted: m })

  fs.unlinkSync(file)
}

const savetube = {
  key: Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex"),
  decrypt(enc) {
    const b = Buffer.from(enc.replace(/\s/g, ""), "base64")
    const iv = b.subarray(0, 16)
    const data = b.subarray(16)
    const d = crypto.createDecipheriv("aes-128-cbc", this.key, iv)
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString())
  },
  async audio(url) {
    const { data } = await axios.get("https://media.savetube.vip/api/random-cdn")
    const info = await axios.post(`https://${data.cdn}/v2/info`, { url })
    const json = this.decrypt(info.data.data)
    const f = json.audio_formats[0]
    const dl = await axios.post(`https://${data.cdn}/download`, {
      id: json.id, key: json.key, downloadType: "audio", quality: String(f.quality)
    })
    const buff = await fetch(dl.data.data.downloadUrl).then(r => r.arrayBuffer())
    return { title: json.title, buffer: Buffer.from(buff) }
  }
}

const savenow = {
  key: "dfcb6d76f2f6a9894gjkege8a4ab232222",
  async audio(url) {
    const r = await fetch(`https://p.savenow.to/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}&api=${this.key}`).then(r => r.json())
    const buff = await fetch(r.download_url).then(r => r.arrayBuffer())
    return { title: r.title || "audio", buffer: Buffer.from(buff) }
  }
}

async function downloadAudio(url) {
  return await Promise.any([
    savetube.audio(url),
    savenow.audio(url)
  ])
}

const handler = async (m, { conn, args }) => {
  const text = args.join(" ")
  if (!text) return m.reply("Usa: .play <texto>")

  const search = await yts(text)
  const video = search.videos?.[0]
  if (!video) return m.reply("Sin resultados")

  global.playCache.set(m.sender, video)

  const caption =
    `🎬 ${video.title}\n` +
    `👤 ${video.author?.name || "-"}`

  await conn.sendMessage(m.chat, {
    image: { url: video.thumbnail },
    caption,
    buttons: [
      { buttonId: "PLAY_AUDIO", buttonText: { displayText: "🎧 Audio" } },
      { buttonId: "PLAY_VIDEO", buttonText: { displayText: "🎬 Video" } }
    ],
    headerType: 4
  }, { quoted: m })
}

handler.all = async function (m, { conn }) {
  if (m.mtype !== "buttonsResponseMessage") return

  const id = m.message.buttonsResponseMessage.selectedButtonId
  const video = global.playCache.get(m.sender)
  if (!video) return

  const caption = `🎬 ${video.title}`

  if (id === "PLAY_AUDIO") {
    const dl = await downloadAudio(video.url)
    return conn.sendMessage(m.chat, {
      audio: dl.buffer,
      mimetype: "audio/mpeg",
      fileName: `${dl.title}.mp3`
    }, { quoted: m })
  }

  if (id === "PLAY_VIDEO") {
    await Promise.any([
      sendFastVideo(conn, m, video, caption),
      sendSafeVideo(conn, m, video, caption)
    ])
  }
}

handler.command = ["play"]
export default handler