"use strict"

import axios from "axios"
import yts from "yt-search"

const API_BASE_GLOBAL = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY_GLOBAL = global.APIKeys?.may || ""

const API_BASE_ENV = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const API_KEY_ENV = process.env.API_KEY || "Russellxz"

const TIMEOUT_MS = 60000

async function sendFast(conn, msg, url, caption) {
  const res = await axios.get(`${API_BASE_GLOBAL}/ytdl`, {
    params: {
      url,
      type: "mp4",
      apikey: API_KEY_GLOBAL
    },
    timeout: 20000,
    validateStatus: () => true
  })

  if (!res?.data?.status || !res.data.result?.url)
    throw new Error("Fast failed")

  await conn.sendMessage(
    msg.chat,
    {
      video: { url: res.data.result.url },
      mimetype: "video/mp4",
      caption
    },
    { quoted: msg }
  )
}

async function sendSafe(conn, msg, url, caption) {
  const r = await axios.post(
    `${API_BASE_ENV}/youtube/resolve`,
    { url, type: "video" },
    {
      headers: {
        apikey: API_KEY_ENV,
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json"
      },
      timeout: 30000,
      validateStatus: () => true
    }
  )

  const data = r.data
  if (!data?.result?.media)
    throw new Error("Safe resolve failed")

  let dl = data.result.media.dl_download || data.result.media.direct
  if (!dl) throw new Error("No media url")
  if (dl.startsWith("/")) dl = API_BASE_ENV + dl

  const res = await axios.get(dl, {
    responseType: "stream",
    headers: {
      apikey: API_KEY_ENV,
      "User-Agent": "Mozilla/5.0",
      Accept: "video/mp4,*/*"
    },
    timeout: 0,
    validateStatus: () => true
  })

  if (res.status >= 400)
    throw new Error(`HTTP_${res.status}`)

  let size = 0
  res.data.on("data", c => size += c.length)

  await conn.sendMessage(
    msg.chat,
    {
      video: {
        stream: res.data,
        length: size || undefined
      },
      mimetype: "video/mp4",
      caption
    },
    { quoted: msg }
  )
}

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()

  if (!query) {
    return conn.sendMessage(
      msg.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <nombre del video>` },
      { quoted: msg }
    )
  }

  await conn.sendMessage(msg.chat, {
    react: { text: "🎬", key: msg.key }
  })

  let finished = false

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      if (!finished) reject(new Error("Tiempo de espera agotado"))
    }, TIMEOUT_MS)
  })

  try {
    await Promise.race([
      (async () => {
        const search = await yts(query)
        const video = search.videos?.[0]
        if (!video) throw new Error("Sin resultados")

        const caption = `
🎬 *${video.title}*
🎥 ${video.author?.name || "—"}
⏱ ${video.timestamp || "--:--"}
        `.trim()

        try {
          await sendFast(conn, msg, video.url, caption)
          finished = true
          return
        } catch {}

        await sendSafe(conn, msg, video.url, caption)
        finished = true
      })(),
      timeoutPromise
    ])
  } catch (err) {
    await conn.sendMessage(
      msg.chat,
      { text: `❌ Error: ${err?.message || "Fallo interno"}` },
      { quoted: msg }
    )
  }
}

handler.command = ["play2"]
handler.help = ["play2]
handler.tags = ["descargas"]

export default handler