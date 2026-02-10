"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import crypto from "crypto"
import { pipeline } from "stream"
import { promisify } from "util"

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
  try {
    return new URL(url).host === new URL(API_BASE_ENV).host
  } catch {
    return false
  }
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

  async download(url, signal) {
    const random = await axios.get("https://media.savetube.vip/api/random-cdn", { signal })
    const cdn = random.data.cdn

    const info = await axios.post(
      `https://${cdn}/v2/info`,
      { url },
      { signal }
    )

    if (!info.data?.status) throw new Error("SaveTube info fail")

    const json = this.decrypt(info.data.data)

    const format =
      json.video_formats.find(v => v.quality === 720) ||
      json.video_formats.find(v => v.quality === 480) ||
      json.video_formats[0]

    if (!format) throw new Error("SaveTube sin formato")

    const dl = await axios.post(
      `https://${cdn}/download`,
      {
        id: json.id,
        key: json.key,
        downloadType: "video",
        quality: String(format.quality)
      },
      { signal }
    )

    const urlDl = dl.data?.data?.downloadUrl
    if (!urlDl) throw new Error("SaveTube sin url")

    return {
      title: json.title,
      url: urlDl
    }
  }
}

async function sendFast(conn, msg, video, caption, signal) {
  const res = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
    params: { url: video.url, type: "mp4", apikey: API_KEY_GLOBAL },
    timeout: 20000,
    signal
  })

  if (!res?.data?.result?.url) throw new Error("Fast fail")

  await conn.sendMessage(
    msg.chat,
    { video: { url: res.data.result.url }, mimetype: "video/mp4", caption },
    { quoted: msg }
  )
}

async function sendSafe(conn, msg, video, caption, signal) {
  const r = await axios.post(
    `${API_BASE_ENV}/youtube/resolve`,
    { url: video.url, type: "video" },
    { headers: { apikey: API_KEY_ENV }, signal }
  )

  let dl = r.data?.result?.media?.direct || r.data?.result?.media?.dl_download
  if (!dl) throw new Error("Safe fail")

  if (dl.startsWith("/")) dl = API_BASE_ENV + dl
  const headers = isSkyUrl(dl) ? { apikey: API_KEY_ENV } : {}

  try {
    await conn.sendMessage(
      msg.chat,
      { video: { url: dl }, mimetype: "video/mp4", caption },
      { quoted: msg }
    )
    return
  } catch {}

  const tmp = ensureTmp()
  const file = path.join(tmp, `${Date.now()}.mp4`)

  const res = await axios.get(dl, {
    responseType: "stream",
    headers,
    timeout: STREAM_TIMEOUT,
    signal
  })

  let size = 0
  res.data.on("data", c => {
    size += c.length
    if (size / 1024 / 1024 > MAX_MB) throw new Error("Muy grande")
  })

  await streamPipe(res.data, fs.createWriteStream(file))

  await conn.sendMessage(
    msg.chat,
    { video: fs.readFileSync(file), mimetype: "video/mp4", caption },
    { quoted: msg }
  )

  fs.unlinkSync(file)
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const q = args.join(" ").trim()
  if (!q) return conn.sendMessage(msg.chat, { text: `${usedPrefix + command} <video>` }, { quoted: msg })

  await conn.sendMessage(msg.chat, { react: { text: "🎬", key: msg.key } })

  const search = await yts(q)
  const video = search.videos?.[0]
  if (!video) throw new Error("Sin resultados")

  const caption = `🎬 *${video.title}*\n⏱ ${video.timestamp}`

  const controllers = [
    new AbortController(),
    new AbortController(),
    new AbortController()
  ]

  const tasks = [
    sendFast(conn, msg, video, caption, controllers[0].signal),
    sendSafe(conn, msg, video, caption, controllers[1].signal),
    savetube.download(video.url, controllers[2].signal).then(r =>
      conn.sendMessage(
        msg.chat,
        { video: { url: r.url }, mimetype: "video/mp4", caption },
        { quoted: msg }
      )
    )
  ]

  await Promise.race(tasks).finally(() => {
    controllers.forEach(c => c.abort())
  })
}

handler.command = ["play2"]
handler.tags = ["descargas"]
handler.help = ["play2 <texto>"]

export default handler