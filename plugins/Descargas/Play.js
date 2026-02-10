"use strict"

import yts from "yt-search"
import axios from "axios"
import crypto from "crypto"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>` },
      { quoted: m }
    )
  }

  await conn.sendMessage(m.chat, { react: { text: "🎬", key: m.key } })

  try {
    const search = await yts(text)
    const video = search.videos?.[0]
    if (!video) throw new Error("Sin resultados")

    const dl = await savetube.download(video.url, "video")
    if (!dl.status) throw new Error(dl.error || "Fallo en la API")

    const caption =
      `🎬 *${dl.result.title}*\n` +
      `⏱ ${video.timestamp || "--:--"}\n` +
      `🎥 ${video.author?.name || "—"}`

    await conn.sendMessage(
      m.chat,
      {
        video: { url: dl.result.download },
        mimetype: "video/mp4",
        caption
      },
      { quoted: m }
    )
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: `❌ Error: ${e.message}` },
      { quoted: m }
    )
  }
}

handler.command = ["play3"]
handler.help = ["play3 <texto>"]
handler.tags = ["descargas"]

export default handler

const savetube = {
  key: Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex"),

  decrypt(enc) {
    const b = Buffer.from(enc.replace(/\s/g, ""), "base64")
    const iv = b.subarray(0, 16)
    const data = b.subarray(16)
    const d = crypto.createDecipheriv("aes-128-cbc", this.key, iv)
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString())
  },

  async download(url, type = "video") {
    try {
      const random = await axios.get("https://media.savetube.vip/api/random-cdn", {
        headers: {
          origin: "https://save-tube.com",
          referer: "https://save-tube.com/",
          "User-Agent": "Mozilla/5.0"
        }
      })

      const cdn = random.data.cdn

      const info = await axios.post(
        `https://${cdn}/v2/info`,
        { url },
        {
          headers: {
            "Content-Type": "application/json",
            origin: "https://save-tube.com",
            referer: "https://save-tube.com/",
            "User-Agent": "Mozilla/5.0"
          }
        }
      )

      if (!info.data?.status) return { status: false, error: "Video no disponible" }

      const json = this.decrypt(info.data.data)

      const format =
        json.video_formats.find(v => v.quality === 720) ||
        json.video_formats.find(v => v.quality === 480) ||
        json.video_formats[0]

      if (!format) return { status: false, error: "Formato no disponible" }

      const dlRes = await axios.post(
        `https://${cdn}/download`,
        {
          id: json.id,
          key: json.key,
          downloadType: "video",
          quality: String(format.quality)
        },
        {
          headers: {
            "Content-Type": "application/json",
            origin: "https://save-tube.com",
            referer: "https://save-tube.com/",
            "User-Agent": "Mozilla/5.0"
          }
        }
      )

      const downloadUrl = dlRes.data?.data?.downloadUrl
      if (!downloadUrl) return { status: false, error: "No se pudo generar el enlace" }

      return {
        status: true,
        result: {
          title: json.title,
          download: downloadUrl,
          quality: format.label
        }
      }
    } catch (e) {
      return { status: false, error: e.message }
    }
  }
}