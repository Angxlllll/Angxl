import yts from 'yt-search'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.reply(m.chat, 'Escribe el nombre de la canción o video', m)
  }

  let text = args.join(' ')
  let search = await yts(text)
  let video = search.videos[0]

  if (!video) {
    return conn.reply(m.chat, 'No encontré resultados', m)
  }

  let caption = `
✨ ── 『 Play Pro 』 ── ✨

🎵 Título: ${video.title}
📺 Canal: ${video.author.name}
👁️ Vistas: ${video.views.toLocaleString()}
⏳ Duración: ${video.timestamp}

⬇️ Selecciona una opción
`.trim()

  let buttons = [
    {
      buttonId: `playpro_audio|${video.url}`,
      buttonText: { displayText: 'Descargar audio' },
      type: 1
    },
    {
      buttonId: `playpro_video|${video.url}`,
      buttonText: { displayText: 'Descargar video' },
      type: 1
    }
  ]

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption,
      buttons,
      footer: 'Angel bot',
      headerType: 4
    },
    { quoted: m }
  )
}

handler.before = async (m, { conn }) => {
  if (!m.message?.buttonsResponseMessage) return

  let id = m.message.buttonsResponseMessage.selectedButtonId
  if (!id) return

  let [action, url] = id.split('|')
  if (!url) return

  if (action === 'playpro_audio') {
    await conn.reply(m.chat, 'Descargando audio', m)
    await conn.sendMessage(m.chat, {
      audio: { url: `https://api.dorratz.com/v2/audio?url=${url}` },
      mimetype: 'audio/mpeg'
    }, { quoted: m })
  }

  if (action === 'playpro_video') {
    await conn.reply(m.chat, 'Descargando video', m)
    await conn.sendMessage(m.chat, {
      video: { url: `https://api.dorratz.com/v2/video?url=${url}` },
      mimetype: 'video/mp4'
    }, { quoted: m })
  }
}

handler.command = ['playpro']
handler.tags = ['descargas']
handler.help = ['playpro <texto>']

export default handler