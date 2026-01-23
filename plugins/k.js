import axios from "axios"
import yts from "yt-search"

const SYLPHY_API = "https://sylphy.xyz/download/ytmp3"
const API_KEY = "sylphy-zws90tK7OG_1768086161703_xc3t6vvmw"

const handler = async (msg, { conn, args, usedPrefix, command }) => {
  const chatId = msg.key.remoteJid
  const query = args.join(" ").trim()

  if (!query) {
    return conn.sendMessage(chatId, {
      text: `✳️ Usa:\n${usedPrefix}${command} <canción>\nEj:\n${usedPrefix}${command} Karma Police`
    }, { quoted: msg })
  }

  await conn.sendMessage(chatId, {
    react: { text: "🔎", key: msg.key }
  })

  try {
    /* 🔎 BÚSQUEDA */
    const search = await yts(query)
    if (!search?.videos?.length) throw "Sin resultados"

    const video = search.videos[0]
    const title = video.title
    const author = video.author?.name || "Desconocido"
    const duration = video.timestamp || "—"
    const thumb = video.thumbnail
    const videoUrl = video.url

    /* 🖼️ INFO + IMAGEN */
    const caption = `
⭒ ִֶָ७ ꯭🎵˙⋆｡ - *Título:* ${title}
⭒ ִֶָ७ ꯭🎤˙⋆｡ - *Artista:* ${author}
⭒ ִֶָ७ ꯭🕑˙⋆｡ - *Duración:* ${duration}

» Enviando audio 🎧
`.trim()

    await conn.sendMessage(chatId, {
      image: { url: thumb },
      caption
    }, { quoted: msg })

    /* 🚀 API SYLPHY */
    const res = await axios.get(SYLPHY_API, {
      params: {
        url: videoUrl,
        api_key: API_KEY
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 20000
    })

    if (
      !res?.data?.status ||
      !res.data.result?.dl_url ||
      !/^https?:\/\//i.test(res.data.result.dl_url)
    ) {
      throw "La API no devolvió link válido"
    }

    const audioUrl = res.data.result.dl_url

    /* 🎧 AUDIO */
    await conn.sendMessage(chatId, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`,
      ptt: false
    }, { quoted: msg })

    await conn.sendMessage(chatId, {
      react: { text: "✅", key: msg.key }
    })

  } catch (e) {
    await conn.sendMessage(chatId, {
      text: "❌ Error al procesar la canción."
    }, { quoted: msg })
  }
}

handler.command = ["playa"]
handler.help = ["playa <texto>"]
handler.tags = ["descargas"]

export default handler