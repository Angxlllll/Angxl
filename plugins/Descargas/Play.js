"use strict"

import yts from "yt-search"
import axios from "axios"
import crypto from "crypto"

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()
  if (!query) return m.reply(`✳️ Usa:\n${usedPrefix}${command} <nombre del video>`)

  await conn.sendMessage(m.chat, { react: { text: "🎬", key: m.key } })

  try {
    const search = await yts(query)
    const video = search.videos?.[0]
    if (!video) throw "Sin resultados"

    const dl = await savetube.download(video.url)
    if (!dl.status) throw dl.error

    await conn.sendMessage(
      m.chat,
      {
        video: { url: dl.result.download },
        mimetype: "video/mp4",
        caption:
          `🎬 *${dl.result.title}*\n` +
          `⏱ ${video.timestamp || "--:--"}\n` +
          `🎥 ${video.author?.name || "—"}`
      },
      { quoted: m }
    )
  } catch (e) {
    m.reply(`❌ Error: ${e}`)
  }
}

handler.command = ["play3"]
handler.help = ["play3 <texto>"]
handler.tags = ["descargas"]

export default handler

const savetube = {
  key: Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex"),

  decrypt(enc) {
    const buf = Buffer.from(enc, "base64")
    const iv = buf.subarray(0, 16)
    const data = buf.subarray(16)
    const decipher = crypto.createDecipheriv("aes-128-cbc", this.key, iv)
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString())
  },

  async download(url) {
    const headers = {
      origin: "https://save-tube.com",
      referer: "https://save-tube.com/",
      "User-Agent": "Mozilla/5.0"
    }

    const { data: rnd } = await axios.get(
      "https://media.savetube.vip/api/random-cdn",
      { headers }
    )

    const cdn = rnd.cdn

    const { data: info } = await axios.post(
      `https://${cdn}/v2/info`,
      { url },
      { headers }
    )

    if (!info?.status) return { status: false, error: "Video no disponible" }

    const json = this.decrypt(info.data)

    const format =
      json.video_formats.find(v => v.quality === 720) ||
      json.video_formats.find(v => v.quality === 480) ||
      json.video_formats[0]

    if (!format) return { status: false, error: "Formato no disponible" }

    const { data: dl } = await axios.post(
      `https://${cdn}/download`,
      {
        id: json.id,
        key: json.key,
        downloadType: "video",
        quality: String(format.quality)
      },
      { headers }
    )

    const link = dl?.data?.downloadUrl
    if (!link) return { status: false, error: "No se pudo generar el enlace" }

    return {
      status: true,
      result: {
        title: json.title,
        download: link
      }
    }
  }
}