import axios from "axios"
import yts from "yt-search"

const API_BASE = (global.APIs?.may || "").replace(/\/+$/, "")
const API_KEY  = global.APIKeys?.may || ""

const handler = async (m, { conn, args, usedPrefix, command }) => {

  const query =
    args.join(" ").trim() ||
    m.text?.slice((usedPrefix + command).length).trim()

  if (!query) {
    return conn.sendMessage(m.chat, {
      text: `✳️ Usa:\n${usedPrefix}${command} <nombre o link>\nEj:\n${usedPrefix}${command} karma police`
    }, { quoted: m })
  }

  await conn.sendMessage(m.chat, {
    react: { text: "🔎", key: m.key }
  })

  try {
    const search = await yts(query)
    const video = search?.videos?.[0]
    if (!video) throw "No se encontraron resultados"

    const {
      title,
      url,
      thumbnail,
      timestamp,
      author
    } = video

    const caption = `
⭒ ִֶָ७ ꯭🎶˙⋆｡ *𝚃𝚒́𝚝𝚞𝚕𝚘:* ${title}
⭒ ִֶָ७ ꯭🎤˙⋆｡ *𝙰𝚞𝚝𝚘𝚛:* ${author?.name || "Desconocido"}
⭒ ִֶָ७ ꯭🕑˙⋆｡ *𝙳𝚞𝚛𝚊𝚌𝚒ó𝚗:* ${timestamp || "Desconocida"}

Selecciona una opción 👇
`.trim()

    await conn.sendMessage(
      m.chat,
      {
        image: { url: thumbnail },
        caption,
        buttons: [
          {
            buttonId: `playa_audio ${url}`,
            buttonText: { displayText: "🎵 Descargar Audio" },
            type: 1
          },
          {
            buttonId: `playa_video ${url}`,
            buttonText: { displayText: "🎬 Descargar Video" },
            type: 1
          }
        ],
        headerType: 4
      },
      { quoted: m }
    )

    await conn.sendMessage(m.chat, {
      react: { text: "✅", key: m.key }
    })

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: `❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`
    }, { quoted: m })
  }
}

handler.before = async (m, { conn }) => {
  const id = m?.message?.buttonsResponseMessage?.selectedButtonId
  if (!id) return

  const [cmd, ...rest] = id.split(" ")
  const url = rest.join(" ")

  try {
    const sent = await conn.sendMessage(
      m.chat,
      { text: cmd === "playa_audio" ? "🎵 Descargando audio..." : "🎬 Descargando video..." },
      { quoted: m }
    )

    const res = await axios.get(`${API_BASE}/ytdl`, {
      params: {
        url,
        type: cmd === "playa_audio" ? "mp3" : "mp4",
        apikey: API_KEY
      },
      timeout: 20000
    })

    const data = res?.data
    const fileUrl = data?.result?.url
    if (!data?.status || !fileUrl) throw "La API no devolvió el archivo"

    const title = (data.result.title || "media").replace(/\.mp3|\.mp4/gi, "")

    if (cmd === "playa_audio") {
      await conn.sendMessage(
        m.chat,
        {
          audio: { url: fileUrl },
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          video: { url: fileUrl },
          mimetype: "video/mp4",
          fileName: `${title}.mp4`
        },
        { quoted: m }
      )
    }

    await conn.sendMessage(
      m.chat,
      { text: "✅ Descarga completada", edit: sent.key }
    )

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: `❌ Error: ${typeof e === "string" ? e : "Fallo interno"}`
    }, { quoted: m })
  }
}

handler.command = ["playa", "play2", "ytplay"]
handler.tags = ["descargas"]
handler.help = ["play <texto>"]

export default handler