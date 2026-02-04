import yts from "yt-search"
import axios from "axios"
import fs from "fs"
import path from "path"
import { pipeline } from "stream"
import { promisify } from "util"

const streamPipe = promisify(pipeline)

const AUDIO_API_URL = "https://api-adonix.ultraplus.click/download/ytaudio"
const AUDIO_API_KEY = "Angxlllll"

const VIDEO_API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "")
const VIDEO_API_KEY = process.env.API_KEY || "Angxll"

const MAX_MB = 200
const STREAM_TIMEOUT = 300000

global.playProCache ||= new Map()

const cleanName = t =>
  t.replace(/[^\w\s.-]/gi, "").substring(0, 60)

const formatViews = v => {
  if (typeof v !== "number") return v
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B"
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K"
  return v.toString()
}

function ensureTmp() {
  const tmp = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  return tmp
}

const handler = async (m, { conn, args, usedPrefix, command }) => {

  const sub = (args[0] || "").toLowerCase()

  if (sub === "audio" || sub === "video") {
    const video = global.playProCache.get(m.chat)
    if (!video) {
      return m.reply("❌ Primero usa:\n" + usedPrefix + "playpro <nombre del video>")
    }

    if (sub === "audio") {
      await m.reply("🎧 Descargando audio...")

      try {
        const { data } = await axios.get(AUDIO_API_URL, {
          params: { url: video.url, apikey: AUDIO_API_KEY },
          timeout: 20000
        })

        const audioUrl =
          data?.data?.url ||
          data?.datos?.url

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
      } catch {
        m.reply("❌ Error al descargar el audio.")
      }
      return
    }

    if (sub === "video") {
      await m.reply("🎬 Descargando video...")

      try {
        const r = await axios.post(
          `${VIDEO_API_BASE}/youtube/resolve`,
          { url: video.url, type: "video" },
          { headers: { apikey: VIDEO_API_KEY } }
        )

        let dl =
          r.data?.result?.media?.direct ||
          r.data?.result?.media?.dl_download

        if (!dl) throw 0
        if (dl.startsWith("/")) dl = VIDEO_API_BASE + dl

        try {
          await conn.sendMessage(
            m.chat,
            { video: { url: dl }, mimetype: "video/mp4" },
            { quoted: m }
          )
          return
        } catch {}

        const tmp = ensureTmp()
        const file = path.join(tmp, `${Date.now()}.mp4`)

        const res = await axios.get(dl, {
          responseType: "stream",
          timeout: STREAM_TIMEOUT
        })

        let size = 0
        const ws = fs.createWriteStream(file)

        res.data.on("data", c => {
          size += c.length
          if (size / 1024 / 1024 > MAX_MB) {
            res.data.destroy()
            ws.destroy()
            fs.existsSync(file) && fs.unlinkSync(file)
            throw new Error("Archivo muy grande")
          }
        })

        await streamPipe(res.data, ws)

        await conn.sendMessage(
          m.chat,
          { video: fs.createReadStream(file), mimetype: "video/mp4" },
          { quoted: m }
        )

        fs.unlinkSync(file)
      } catch {
        m.reply("❌ Error al descargar el video.")
      }
      return
    }
  }

  const query = args.join(" ").trim()
  if (!query) {
    return m.reply("✳️ Usa:\n" + usedPrefix + "playpro <nombre del video>")
  }

  await conn.sendMessage(m.chat, { react: { text: "🔎", key: m.key } })

  const search = await yts(query)
  const video = search?.videos?.[0]
  if (!video) return m.reply("❌ Sin resultados.")

  global.playProCache.set(m.chat, video)

  const caption = `
✧━───『 𝙋𝙡𝙖𝙮 𝙋𝙧𝙤 』───━✧

🎵 Título: ${video.title}
📺 Canal: ${video.author?.name || "—"}
👁️ Vistas: ${formatViews(video.views)}
⏳ Duración: ${video.timestamp || "—"}

⬇️ Selecciona una opción
`.trim()

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption,
      buttons: [
        {
          buttonId: `${usedPrefix}playpro audio`,
          buttonText: { displayText: "🎧 Descargar audio" },
          type: 1
        },
        {
          buttonId: `${usedPrefix}playpro video`,
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
handler.help = ["playpro <texto>"]

export default handler