import yts from "yt-search"
import axios from "axios"

const API_AUDIO = "https://api-adonix.ultraplus.click/download/ytaudio"
const API_VIDEO = "https://api-sky.ultraplus.click/youtube/resolve"
const API_KEY_AUDIO = "Angxlllll"
const API_KEY_VIDEO = "Angxll"

const cache = new Map()

const handler = async (m, { conn, args, usedPrefix }) => {
  const query = args.join(" ").trim()
  if (!query) return m.reply("✳️ Usa: .playpro <nombre del video>")

  await conn.sendMessage(m.chat, {
    react: { text: "🔎", key: m.key }
  })

  const search = await yts(query)
  const video = search.videos?.[0]
  if (!video) return m.reply("❌ No se encontraron resultados")

  cache.set(m.sender, video)

  const caption = `
✧━───『 𝙋𝙡𝙖𝙮 𝙋𝙧𝙤 』───━✧

🎬 *${video.title}*
📺 ${video.author?.name || "—"}
👁️ ${formatViews(video.views)}
⏱ ${video.timestamp || "--:--"}
  `.trim()

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption,
      buttons: [
        {
          buttonId: "..playproaudio",
          buttonText: { displayText: "🎵 Descargar audio" },
          type: 1
        },
        {
          buttonId: "..playprovideo",
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

async function downloadAudio(m, { conn }) {
  const video = cache.get(m.sender)
  if (!video) return m.reply("❌ Usa primero .playpro")

  await conn.sendMessage(m.chat, {
    react: { text: "🎵", key: m.key }
  })

  const { data } = await axios.get(API_AUDIO, {
    params: { url: video.url, apikey: API_KEY_AUDIO },
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

downloadAudio.command = ["playproaudio"]
export { downloadAudio }

async function downloadVideo(m, { conn }) {
  const video = cache.get(m.sender)
  if (!video) return m.reply("❌ Usa primero .playpro")

  await conn.sendMessage(m.chat, {
    react: { text: "🎬", key: m.key }
  })

  const r = await axios.post(
    API_VIDEO,
    { url: video.url, type: "video" },
    { headers: { apikey: API_KEY_VIDEO } }
  )

  const dl =
    r.data?.result?.media?.direct ||
    r.data?.result?.media?.dl_download

  if (!dl) throw 0

  await conn.sendMessage(
    m.chat,
    {
      video: { url: dl },
      mimetype: "video/mp4"
    },
    { quoted: m }
  )
}

downloadVideo.command = ["playprovideo"]
export { downloadVideo }

const cleanName = t =>
  t.replace(/[^\w\s.-]/gi, "").substring(0, 60)

const formatViews = v => {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B"
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K"
  return v.toString()
}