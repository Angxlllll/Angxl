import fetch from "node-fetch"
import crypto from "crypto"

function isYouTube(url = "") {
  return /^https?:\/\//i.test(url) &&
         /(youtube\.com|youtu\.be|music\.youtube\.com)/i.test(url)
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0]
  if (!url || !isYouTube(url)) {
    return conn.sendMessage(
      m.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <link de YouTube>` },
      { quoted: m }
    )
  }

  await conn.sendMessage(m.chat, { react: { text: "🎧", key: m.key } })

  try {
    const dl = await downloadAudio(url)
    if (!dl?.stream) throw "No se pudo descargar"

    await conn.sendMessage(
      m.chat,
      {
        audio: dl.stream,
        mimetype: "audio/mpeg",
        fileName: `${dl.title}.mp3`
      },
      { quoted: m }
    )
  } catch (e) {
    await conn.sendMessage(
      m.chat,
      { text: `❌ Error: ${e}` },
      { quoted: m }
    )
  }
}

handler.command = ["ytmp3"]
handler.tags = ["descargas"]
handler.help = ["ytmp3 <url>"]

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
    const random = await fetch("https://media.savetube.vip/api/random-cdn").then(r => r.json())
    const cdn = random.cdn

    const info = await fetch(`https://${cdn}/v2/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    }).then(r => r.json())

    if (!info?.status) throw "savetube info error"

    const json = this.decrypt(info.data)
    const format = json.audio_formats.find(a => a.quality === 128) || json.audio_formats[0]
    if (!format) throw "savetube audio error"

    const dl = await fetch(`https://${cdn}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: json.id,
        key: json.key,
        downloadType: "audio",
        quality: String(format.quality)
      })
    }).then(r => r.json())

    if (!dl?.data?.downloadUrl) throw "savetube link error"

    const stream = await fetch(dl.data.downloadUrl)
    return { title: json.title, stream }
  }
}

const savenow = {
  key: "dfcb6d76f2f6a9894gjkege8a4ab232222",

  async audio(url) {
    const r = await fetch(
      `https://p.savenow.to/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}&api=${this.key}`
    ).then(r => r.json())

    if (!r?.success || !r?.download_url) throw "savenow error"

    const stream = await fetch(r.download_url)
    return { title: r.title || "audio", stream }
  }
}

async function downloadAudio(url) {
  return await Promise.any([
    savetube.audio(url),
    savenow.audio(url)
  ])
}