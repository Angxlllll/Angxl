"use strict"

import yts from "yt-search"
import axios from "axios"
import crypto from "crypto"
import fetch from "node-fetch"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE_FAST = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_FAST = global.APIKeys?.may || ""

const API_BASE_SAFE = "https://api-sky.ultraplus.click"
const API_KEY_SAFE = "Angxll"

const MAX_MB = 200

function ensureTmp() {
  const dir = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function videoFast(conn, m, video, caption) {
  if (!API_BASE_FAST || !API_KEY_FAST) throw "Fast no disponible"

  const r = await axios.get(`${API_BASE_FAST}/ytdl`, {
    params: {
      url: video.url,
      type: "mp4",
      apikey: API_KEY_FAST
    },
    timeout: 20000
  })

  const url = r?.data?.result?.url
  if (!url) throw "Fast falló"

  await conn.sendMessage(
    m.chat,
    { video: { url }, mimetype: "video/mp4", caption },
    { quoted: m }
  )
}

async function videoSafe(conn, m, video, caption) {
  const r = await axios.post(
    `${API_BASE_SAFE}/youtube/resolve`,
    { url: video.url, type: "video" },
    { headers: { apikey: API_KEY_SAFE } }
  )

  let dl = r?.data?.result?.media?.direct
  if (!dl) throw "Safe falló"

  try {
    await conn.sendMessage(
      m.chat,
      { video: { url: dl }, mimetype: "video/mp4", caption },
      { quoted: m }
    )
    return
  } catch {}

  const tmp = ensureTmp()
  const file = path.join(tmp, `${Date.now()}.mp4`)

  const res = await axios.get(dl, { responseType: "stream" })
  let size = 0

  res.data.on("data", c => {
    size += c.length
    if (size / 1024 / 1024 > MAX_MB) {
      res.data.destroy()
      throw "Video muy pesado"
    }
  })

  await streamPipe(res.data, fs.createWriteStream(file))

  await conn.sendMessage(
    m.chat,
    { video: fs.createReadStream(file), mimetype: "video/mp4", caption },
    { quoted: m }
  )

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
    const cdn = data.cdn

    const info = await axios.post(`https://${cdn}/v2/info`, { url })
    const json = this.decrypt(info.data.data)

    const f = json.audio_formats[0]
    const dl = await axios.post(`https://${cdn}/download`, {
      id: json.id,
      key: json.key,
      downloadType: "audio",
      quality: String(f.quality)
    })

    const buff = await fetch(dl.data.data.downloadUrl).then(r => r.arrayBuffer())
    return { title: json.title, buffer: Buffer.from(buff) }
  }
}

const savenow = {
  key: "dfcb6d76f2f6a9894gjkege8a4ab232222",

  async audio(url) {
    const r = await fetch(
      `https://p.savenow.to/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}&api=${this.key}`
    ).then(r => r.json())

    const buff = await fetch(r.download_url).then(r => r.arrayBuffer())
    return { title: r.title || "audio", buffer: Buffer.from(buff) }
  }
}

async function audioDownload(url) {
  return await Promise.any([
    savetube.audio(url),
    savenow.audio(url)
  ])
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const query = (args.length ? args.join(" ") : m.text).trim()

  if (query.startsWith("play:audio:")) {
    await conn.sendMessage(m.chat, {
      react: { text: "🎧", key: m.key }
    })

    const url = `https://youtu.be/${query.split(":")[2]}`
    const dl = await audioDownload(url)

    return conn.sendMessage(
      m.chat,
      {
        audio: dl.buffer,
        mimetype: "audio/mpeg",
        fileName: `${dl.title}.mp3`
      },
      { quoted: m }
    )
  }

  if (query.startsWith("play:video:")) {
    await conn.sendMessage(m.chat, {
      react: { text: "📹", key: m.key }
    })

    const url = `https://youtu.be/${query.split(":")[2]}`
    const video = (await yts(url)).videos[0]
    const caption = `🎬 ${video.title}\n🎥 ${video.author.name}`

    return Promise.any([
      videoFast(conn, m, video, caption),
      videoSafe(conn, m, video, caption)
    ])
  }

  if (!query) {
    return m.reply(`✳️ Usa:\n${usedPrefix}${command} <texto>`)
  }

  const search = await yts(query)
  const video = search.videos?.[0]
  if (!video) throw "Sin resultados"

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption: `🎬 *${video.title}*\n🎥 ${video.author.name}`,
      buttons: [
        { buttonId: `play:audio:${video.videoId}`, buttonText: { displayText: "🎧 Audio" }, type: 1 },
        { buttonId: `play:video:${video.videoId}`, buttonText: { displayText: "🎬 Video" }, type: 1 }
      ],
      headerType: 4
    },
    { quoted: m }
  )
}

handler.command = ["play"]
handler.tags = ["descargas"]
handler.help = ["play <texto>"]

export default handler