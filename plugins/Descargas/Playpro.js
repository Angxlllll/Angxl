"use strict"

import yts from "yt-search"
import axios from "axios"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

/* ========= CONFIG ========= */

const AUDIO_API_URL = "https://api-adonix.ultraplus.click/download/ytaudio"
const AUDIO_API_KEY = "Angxlllll"

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Angxll"

const MAX_MB = 200
const STREAM_TIMEOUT = 300000

/* ========= HELPERS ========= */

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

/* ========= AUDIO ========= */

async function sendAudio(conn, m, video) {
  const { data } = await axios.get(AUDIO_API_URL, {
    params: { url: video.url, apikey: AUDIO_API_KEY },
    timeout: 20000
  })

  const audioUrl =
    data?.data?.url ||
    data?.datos?.url

  if (!audioUrl) throw new Error("Audio no disponible")

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

/* ========= VIDEO ========= */

async function sendVideo(conn, m, video) {
  const r = await axios.post(
    `${API_BASE_ENV}/youtube/resolve`,
    { url: video.url, type: "video" },
    { headers: { apikey: API_KEY_ENV } }
  )

  const media = r?.data?.result?.media
  let dl = media?.dl_download || media?.direct
  if (!dl) throw new Error("Video no disponible")

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
      throw new Error("Video demasiado grande")
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

/* ========= HANDLER ========= */

const handler = async (m, { conn, args, usedPrefix }) => {
  const text = args.join(" ").trim()

  // 🔘 Respuesta a botones
  if (m.text?.startsWith("PLAYPRO::")) {
    const [, type, url] = m.text.split("::")
    const search = await yts({ videoId: url.split("v=")[1] })
    const video = search?.videos?.[0]
    if (!video) return m.reply("❌ Video no encontrado")

    try {
      if (type === "AUDIO") await sendAudio(conn, m, video)
      if (type === "VIDEO") await sendVideo(conn, m, video)
    } catch {
      m.reply("❌ Error al descargar")
    }
    return
  }

  if (!text) {
    return m.reply(`✳️ Usa:\n${usedPrefix}playpro <nombre del video>`)
  }

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
          buttonId: `PLAYPRO::AUDIO::${video.url}`,
          buttonText: { displayText: "🎵 Descargar audio" },
          type: 1
        },
        {
          buttonId: `PLAYPRO::VIDEO::${video.url}`,
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
handler.tags = ["descargas"]

export default handler