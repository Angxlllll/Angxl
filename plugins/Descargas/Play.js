"use strict"

import yts from "yt-search"

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const query = args.join(" ").trim()
  if (!query) {
    return conn.sendMessage(
      m.chat,
      { text: `✳️ Usa:\n${usedPrefix}${command} <texto>` },
      { quoted: m }
    )
  }

  await conn.sendMessage(m.chat, {
    react: { text: "🎬", key: m.key }
  })

  const search = await yts(query)
  const video = search.videos?.[0]
  if (!video) {
    return conn.sendMessage(
      m.chat,
      { text: "❌ No se encontraron resultados" },
      { quoted: m }
    )
  }

  const caption =
    `🎬 *${video.title}*\n` +
    `👤 ${video.author?.name || "—"}\n` +
    `⏱ ${video.timestamp || "--:--"}`

  const buttonCmd = `${usedPrefix}ytmp4 ${video.url}`

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption,
      buttons: [
        {
          buttonId: buttonCmd,
          buttonText: { displayText: "🎬 Video" },
          type: 1
        }
      ],
      headerType: 4
    },
    { quoted: m }
  )
}

handler.command = ["play3"]
handler.help = ["play3 <texto>"]
handler.tags = ["descargas"]

export default handler