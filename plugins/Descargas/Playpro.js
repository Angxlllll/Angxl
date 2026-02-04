"use strict"

import yts from "yt-search"
import axios from "axios"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Angxll"

const AUDIO_API_URL = "https://api-adonix.ultraplus.click/download/ytaudio"
const AUDIO_API_KEY = "Angxlllll"

const MAX_MB = 200
const STREAM_TIMEOUT = 300000

const cleanName = t =>
  t.replace(/[^\w\s.-]/gi, "").substring(0, 60)

const formatViews = v => {
  if (typeof v !== "number") return v
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B"
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K"
  return String(v)
}

function ensureTmp() {
  const tmp = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

async function sendAudio(conn, m, video) {
  await m.reply("🎵 Descargando audio...")

  const { data } = await axios.get(AUDIO_API_URL, {
    params: { url: video.url, apikey: AUDIO_API_KEY },
    timeout: 20000
  })

  const audioUrl = data?.data?.url || data?.datos?.url
  if (!audioUrl) throw 0

  await conn.sendMessage(
    m.chat,
    {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: cleanName(video.title) + ".mp3"
    },
    { quoted: m }
  )
}

async function sendFast(conn, m, video) {
  const r = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
    params: { url: video.url, type: "mp4", apikey: API_KEY_GLOBAL },
    timeout: 20000
  })

  if (!r?.data?.result?.url) throw 0

  await conn.sendMessage(
    m.chat,
    { video: { url: r.data.result.url }, mimetype: "video/mp4" },
    { quoted: m }
  )
}

async function sendSafe(conn, m, video) {
  const r = await axios.post(
    `${API_BASE_ENV}/youtube/resolve`,
    { url: video.url, type: "video" },
    { headers: { apikey: API_KEY_ENV } }
  )

  let dl = r?.data?.result?.media?.dl_download || r?.data?.result?.media?.direct
  if (!dl) throw 0
  if (dl.startsWith("/")) dl = API_BASE_ENV + dl

  try {
    await conn.sendMessage(
      m.chat,
      { video: { url: dl }, mimetype: "video/mp4" },
      { quoted: m }
    )
    return
  } catch {}

  const tmp = ensureTmp()
  const filePath = path.join(tmp, `${Date.now()}.mp4`)

  const res = await axios.get(dl, {
    responseType: "stream",
    timeout: STREAM_TIMEOUT
  })

  let size = 0
  const ws = fs.createWriteStream(filePath)

  res.data.on("data", c => {
    size += c.length
    if (size / 1024 / 1024 > MAX_MB) {
      res.data.destroy()
      ws.destroy()
      fs.unlinkSync(filePath)
      throw 0
    }
  })

  await streamPipe(res.data, ws)

  await conn.sendMessage(
    m.chat,
    { video: fs.createReadStream(filePath), mimetype: "video/mp4" },
    { quoted: m }
  )

  fs.unlinkSync(filePath)
}

const handler = async (m, { conn, args, usedPrefix }) => {
  if (m.text?.startsWith("PLAYPRO::")) {
    const [, type, url] = m.text.split("::")
    const search = await yts({ videoId: url.split("v=")[1] })
    const video = search?.videos?.[0]
    if (!video) return m.reply("❌ Video no encontrado")

    try {
      if (type === "AUDIO") return await sendAudio(conn, m, video)
      if (type === "VIDEO") {
        await m.reply("🎬 Descargando video...")
        try {
          return await sendFast(conn, m, video)
        } catch {
          return await sendSafe(conn, m, video)
        }
      }
    } catch {
      return m.reply("❌ Error al descargar")
    }
  }

  const text = args.join(" ").trim()
  if (!text) return m.reply(`✳️ Usa:\n${usedPrefix}playpro <nombre del video>`)

  const search = await yts(text)
  const video = search?.videos?.[0]
  if (!video) return m.reply("❌ Sin resultados")

  const caption = `
🎼 *${video.title}*
📺 ${video.author?.name || "—"}
👁 ${formatViews(video.views)}
⏱ ${video.timestamp}
`.trim()

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption,
      buttons: [
        {
          buttonId: `.PLAYPRO::AUDIO::${video.url}`,
          buttonText: { displayText: "🎵 Descargar audio" },
          type: 1
        },
        {
          buttonId: `.PLAYPRO::VIDEO::${video.url}`,
          buttonText: { displayText: "🎬 Descargar video" },
          type: 1
        }
      ],
      headerType: 4
    },
    { quoted: m }
  )
}

handler.command = ["playpro"]
handler.customPrefix = /^(?:\.playpro|PLAYPRO::)/i
handler.tags = ["descargas"]

export default handler