import yts from 'yt-search'

let handler = async (m, { conn, args, command }) => {

  if (command === 'playpro') {
    if (!args[0]) return m.reply(m.chat, 'Escribe el nombre de la canción o video', m)

    let text = args.join(' ')
    let search = await yts(text)
    let video = search.videos[0]
    if (!video) return m.reply(m.chat, 'No encontré resultados', m)

    let caption = `
✨ ── 『 Play Pro 』 ── ✨

🎵 Título: ${video.title}
📺 Canal: ${video.author.name}
👁️ Vistas: ${video.views.toLocaleString()}
⏳ Duración: ${video.timestamp}

⬇️ Selecciona una opción
`.trim()

    return await conn.sendMessage(m.chat, {
      image: { url: video.thumbnail },
      caption,
      footer: 'Angel bot',
      buttons: [
        { buttonId: `.playproaudio ${video.url}`, buttonText: { displayText: 'Descargar audio' }, type: 1 },
        { buttonId: `.playprovideo ${video.url}`, buttonText: { displayText: 'Descargar video' }, type: 1 }
      ],
      headerType: 4
    }, { quoted: m })
  }

  if (command === 'playproaudio') {
    if (!args[0]) return
    await m.reply(m.chat, 'Descargando audio', m)
    return await conn.sendMessage(m.chat, {
      audio: { url: `https://api.dorratz.com/v2/audio?url=${args[0]}` },
      mimetype: 'audio/mpeg'
    }, { quoted: m })
  }

  if (command === 'playprovideo') {
    if (!args[0]) return
    await m.reply(m.chat, 'Descargando video', m)
    return await conn.sendMessage(m.chat, {
      video: { url: `https://api.dorratz.com/v2/video?url=${args[0]}` },
      mimetype: 'video/mp4'
    }, { quoted: m })
  }
}

handler.command = ['playpro', 'playproaudio', 'playprovideo']
handler.tags = ['descargas']
handler.help = ['playpro <texto>']

export default handler