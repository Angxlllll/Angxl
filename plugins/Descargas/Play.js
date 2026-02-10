"use strict"

import yts from "yt-search"
import axios from "axios"
import crypto from "crypto"
import fetch from "node-fetch"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from "@whiskeysockets/baileys"

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

/* =======================
   VIDEO
======================= */

async function videoFast(conn, m, video, caption) {
  if (!API_BASE_FAST || !API_KEY_FAST) throw "Fast no disponible"

  const r = await axios.get(`${API_BASE_FAST}/ytdl`, {
    params: { url: video.url, type: "mp4", apikey: API_KEY_FAST },
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

  await conn.sendMessage(
    m.chat,
    { video: { url: dl }, mimetype: "video/mp4", caption },
    { quoted: m }
  )
}

/* =======================
   AUDIO
======================= */

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

/* =======================
   HANDLER
======================= */

const handler = async (m, { conn, args, usedPrefix, command }) => {
  global.db ||= {}
  global.db.data ||= {}
  global.db.data.users ||= {}

  const query = args.join(" ").trim()
  if (!query) return m.reply(`✳️ Usa:\n${usedPrefix}${command} <texto>`)

  const search = await yts(query)
  const video = search.videos?.[0]
  if (!video) throw "Sin resultados"

  global.db.data.users[m.sender] ||= {}
  global.db.data.users[m.sender].playVideo = video
  global.db.data.users[m.sender].playTime = Date.now()

  const media = await prepareWAMessageMedia(
    { image: { url: video.thumbnail } },
    { upload: conn.waUploadToServer }
  )

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            ...media
          }),
          body: proto.Message.InteractiveMessage.Body.create({
            text: `🎬 *${video.title}*\n🎥 ${video.author.name}`
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: "YouTube Downloader"
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🎧 Audio",
                  id: "play_audio"
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "📹 Video",
                  id: "play_video"
                })
              }
            ]
          })
        })
      }
    }
  }, { quoted: m })

  await conn.relayMessage(m.chat, msg.message, {})
}

handler.before = async function (m, { conn }) {
  const response =
    m.message?.interactiveResponseMessage?.nativeFlowResponseMessage

  if (!response) return

  const { id } = JSON.parse(response.paramsJson || "{}")
  if (!id) return

  const user = global.db.data.users[m.sender]
  if (!user?.playVideo) return

  const video = user.playVideo
  delete user.playVideo

  if (id === "play_audio") {
    await conn.sendMessage(m.chat, { react: { text: "🎧", key: m.key } })
    const dl = await audioDownload(video.url)

    return conn.sendMessage(
      m.chat,
      { audio: dl.buffer, mimetype: "audio/mpeg", fileName: `${dl.title}.mp3` },
      { quoted: m }
    )
  }

  if (id === "play_video") {
    await conn.sendMessage(m.chat, { react: { text: "📹", key: m.key } })

    const caption = `🎬 ${video.title}\n🎥 ${video.author.name}`

    return Promise.any([
      videoFast(conn, m, video, caption),
      videoSafe(conn, m, video, caption)
    ])
  }
}

handler.command = ["play"]
handler.tags = ["descargas"]
handler.help = ["play <texto>"]

export default handler