"use strict"

import yts from "yt-search"
import axios from "axios"
import crypto from "crypto"
import fetch from "node-fetch"

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()
  if (!query) {
    return conn.sendMessage(
      m.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <nombre del audio>` },
      { quoted: m }
    )
  }

  await conn.sendMessage(m.chat, { react: { text: "🎧", key: m.key } })

  try {
    const search = await yts(query)
    const video = search.videos?.[0]
    if (!video) throw "Sin resultados"

    const dl = await downloadAudio(video.url)
    if (!dl?.url) throw "No se pudo descargar"

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: dl.url },
        mimetype: "audio/mpeg",
        fileName: `${dl.title}.mp3`
      },
      { quoted: m }
    )
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: `❌ Error: ${e.message || e}` },
      { quoted: m }
    )
  }
}

handler.command = ["play"]
handler.help = ["play <texto>"]
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

  async audio(url) {
    const random = await axios.get("https://media.savetube.vip/api/random-cdn")
    const cdn = random.data.cdn

    const info = await axios.post(`https://${cdn}/v2/info`, { url })
    if (!info.data?.status) throw "savetube info error"

    const json = this.decrypt(info.data.data)
    const format = json.audio_formats.find(a => a.quality === 128) || json.audio_formats[0]
    if (!format) throw "savetube audio error"

    const dl = await axios.post(`https://${cdn}/download`, {
      id: json.id,
      key: json.key,
      downloadType: "audio",
      quality: String(format.quality)
    })

    const link = dl.data?.data?.downloadUrl
    if (!link) throw "savetube link error"

    return { title: json.title, url: link }
  }
}

const savenow = {
  key: "dfcb6d76f2f6a9894gjkege8a4ab232222",

  async audio(url) {
    const init = await fetch(
      `https://p.savenow.to/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}&api=${this.key}`
    ).then(r => r.json())

    if (!init.success) throw "savenow init error"

    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const p = await fetch(`https://p.savenow.to/api/progress?id=${init.id}`).then(r => r.json())
      if (p.progress === 1000) {
        return { title: init.title, url: p.download_url }
      }
    }

    throw "savenow timeout"
  }
}

const amscraper = {
  async audio(url) {
    const r = await axios.get(
      `https://scrapers.hostrta.win/scraper/24?url=${encodeURIComponent(url)}`
    )

    const a =
      r.data?.audio?.url ||
      r.data?.formats?.find(f => f.mimeType?.includes("audio"))?.url

    if (!a) throw "amscraper error"
    return { title: r.data.title || "Audio", url: a }
  }
}

const backup = {
  async audio(url) {
    const r = await axios.get(
      `https://youtube-downloader-api.vercel.app/info?url=${encodeURIComponent(url)}`
    )

    const a = r.data?.data?.formats
      ?.filter(f => f.mimeType?.includes("audio"))
      ?.sort((a, b) => b.bitrate - a.bitrate)[0]?.url

    if (!a) throw "backup error"
    return { title: r.data.data.title || "Audio", url: a }
  }
}

async function downloadAudio(url) {
  const tasks = [
    savetube.audio(url),
    savenow.audio(url),
    amscraper.audio(url),
    backup.audio(url)
  ]

  try {
    return await Promise.any(
      tasks.map(p =>
        Promise.resolve(p).then(r => {
          if (!r?.url) throw "invalid"
          return r
        })
      )
    )
  } catch {
    throw "todas las apis fallaron"
  }
}