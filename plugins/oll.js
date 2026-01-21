import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY = global.APIKeys?.may || ""

const handler = async (m, { conn, args, command, usedPrefix }) => {
  if (command === "playa_audio") {
    const url = args[0]
    if (!url) return m.reply("❌ URL inválida")
    m.reply("🎵 Descargando audio...")
    const res = await axios.get(`${API_BASE}/ytdl`, { params: { url, type: "mp3", apikey: API_KEY }, timeout: 20000 })
    const data = res.data
    if (!data?.status || !data?.result?.url) throw "La API no devolvió el audio"
    const title = (data.result.title || "audio").replace(/[\\/:*?"<>|]/g, "")
    await conn.sendMessage(m.chat, { audio: { url: data.result.url }, mimetype: "audio/mpeg", fileName: `${title}.mp3` }, { quoted: m })
    return
  }
  if (command === "playa_video") {
    const url = args[0]
    if (!url) return m.reply("❌ URL inválida")
    m.reply("🎬 Descargando video...")
    const res = await axios.get(`${API_BASE}/ytdl`, { params: { url, type: "mp4", apikey: API_KEY }, timeout: 20000 })
    const data = res.data
    if (!data?.status || !data?.result?.url) throw "La API no devolvió el video"
    const title = (data.result.title || "video").replace(/[\\/:*?"<>|]/g, "")
    await conn.sendMessage(m.chat, { video: { url: data.result.url }, mimetype: "video/mp4", fileName: `${title}.mp4` }, { quoted: m })
    return
  }

  const query = args.join(" ").trim() || m.text?.slice((usedPrefix + command).length).trim()
  if (!query) return m.reply(`✳️ Usa:\n${usedPrefix}${command} <nombre o link>\nEj:\n${usedPrefix}${command} karma police`)
  await conn.sendMessage(m.chat, { react: { text: "🔎", key: m.key } })

  try {
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) throw "No se encontraron resultados"
    const { title, url, thumbnail, timestamp, author } = video
    const caption = `⭒ ִֶָ७ ꯭🎶˙⋆｡ *𝚃𝚒́𝚝𝚞𝚕𝚘:* ${title}\n⭒ ִֶָ७ ꯭🎤˙⋆｡ *𝙰𝚞𝚝𝚘𝚛:* ${author?.name||"Desconocido"}\n⭒ ִֶָ७ ꯭🕑˙⋆｡ *𝙳𝚞𝚛𝚊𝚌𝚒ó𝚗:* ${timestamp||"Desconocida"}\n\nSelecciona una opción 👇`
    await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption, buttons: [{ buttonId: `${usedPrefix}playa_audio ${url}`, buttonText: { displayText: "🎵 Descargar Audio" }, type: 1 }, { buttonId: `${usedPrefix}playa_video ${url}`, buttonText: { displayText: "🎬 Descargar Video" }, type: 1 }], headerType: 4 }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } })
  } catch(e) {
    m.reply(`❌ Error: ${typeof e==="string"?e:"Fallo interno"}`)
  }
}

handler.command = ["playa","play","ytplay","playa_audio","playa_video"]
handler.tags = ["descargas"]
handler.help = ["playa <texto>"]

export default handler