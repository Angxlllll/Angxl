"use strict"

import axios from "axios"
import yts from "yt-search"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const MAX_MB = 200

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

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024)
}

async function downloadToFile(url, filePath) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`)
  await streamPipe(res.data, fs.createWriteStream(filePath))
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {

  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  if (!query)
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>\nEj:\n${usedPrefix}${command} karma police`
    }, { quoted: msg })

  await conn.sendMessage(chatId, {
    react: { text: "🎬", key: msg.key }
  })

  try {
    const search = await yts(query)
    if (!search?.videos?.length)
      throw new Error("No se encontraron resultados")

    const video = search.videos[0]

    const title     = video.title
    const author    = video.author?.name || "Desconocido"
    const duration  = video.timestamp || "Desconocida"
    const thumb     = video.thumbnail
    const videoLink = video.url

    const caption = `
⭒ 🎬 *Título:* ${title}
⭒ 🎤 *Autor:* ${author}
⭒ 🕑 *Duración:* ${duration}

» Enviando video 🎥
`.trim()

    await conn.sendMessage(chatId, {
      image: { url: thumb },
      caption
    }, { quoted: msg })

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url: videoLink,
        type: "mp4",
        apikey: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    const media =
      res.data?.result?.media ||
      res.data?.result ||
      {}

    const videoUrl =
      media.dl_download ||
      media.direct ||
      res.data?.result?.url ||
      res.data?.result?.direct ||
      res.data?.result?.dl

    if (!videoUrl)
      throw new Error("No se pudo obtener el video")

    const tmp = ensureTmp()
    const filePath = path.join(tmp, `${Date.now()}.mp4`)

    await downloadToFile(videoUrl, filePath)

    if (fileSizeMB(filePath) > MAX_MB) {
      fs.unlinkSync(filePath)
      throw new Error("El archivo es demasiado grande")
    }

    await conn.sendMessage(chatId, {
      video: fs.readFileSync(filePath),
      mimetype: "video/mp4",
      fileName: `${safeName(title)}.mp4`
    }, { quoted: msg })

    fs.unlinkSync(filePath)

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    })

  } catch (err) {
    await conn.sendMessage(chatId, {
      text: `❌ Error: ${err?.message || "Fallo interno"}`
    }, { quoted: msg })
  }
}

handler.command = ["play2"]
handler.help    = ["play2 <texto>"]
handler.tags    = ["descargas"]

export default handler