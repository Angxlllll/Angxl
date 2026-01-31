import acrcloud from 'acrcloud'
import yts from 'yt-search'
import fetch from 'node-fetch'
import crypto from 'crypto'

global.whatMusicCache ||= new Map()

const acr = new acrcloud({
  host: 'identify-eu-west-1.acrcloud.com',
  access_key: 'c33c767d683f78bd17d4bd4991955d81',
  access_secret: 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu'
})

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
      await conn.sendMessage(m.chat, {
    react: { text: "🕒", key: m.key }
  })

    const q = m.quoted || m
    const mime = (q.msg || q).mimetype || q.mediaType || ''

    if (!/audio|video/.test(mime))
      return m.reply(`Etiqueta un audio o video con ${usedPrefix + command}`)

    const buffer = await q.download?.()
    if (!buffer) return m.reply('No pude descargar el archivo.')

    const duration = q.seconds || 0
    if (duration > 240)
      return m.reply(`Máximo 3 minutos. El tuyo dura ${duration}s.`)

    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    if (whatMusicCache.has(hash))
      return conn.sendMessage(m.chat, whatMusicCache.get(hash), { quoted: m })

    const result = await acr.identify(buffer).catch(() => null)
    if (!result || result.status?.code !== 0)
      return m.reply(result?.status?.msg || 'No se pudo identificar.')

    const music = result.metadata?.music?.[0]
    if (!music) return m.reply('No se encontró coincidencia.')

    const title = music.title || 'Desconocido'
    const artist = music.artists?.map(a => a.name).join(', ') || 'Desconocido'
    const album = music.album?.name
    const genres = music.genres?.map(g => g.name).join(', ')
    const release = music.release_date || 'Desconocido'

    let txt =
`┏╾❑「 WhatMusic 」
┃ 🎵 Título: ${title}
┃ 👤 Artista: ${artist}`
    if (album) txt += `\n┃ 💿 Álbum: ${album}`
    if (genres) txt += `\n┃ 🎼 Género: ${genres}`
    txt += `\n┃ 📅 Lanzamiento: ${release}\n`

    let search = await yts(`${title} ${artist}`).catch(() => null)
    const video = search?.videos?.find(v => v.views > 500 && v.duration.seconds < 600)

    let msg
    if (video) {
      txt +=
`┃ ▶ YouTube: ${video.title}
┃ 📺 Canal: ${video.author?.name || 'Desconocido'}
┃ 👁 Vistas: ${video.views.toLocaleString()}
┃ ⏱ Duración: ${video.timestamp}
┃ 🔗 ${video.url}
┗╾❑`

      const res = await fetch(video.thumbnail)
      const img = Buffer.from(await res.arrayBuffer())

      msg = { image: img, caption: txt }
    } else {
      txt += '┗╾❑'
      msg = { text: txt }
    }

    whatMusicCache.set(hash, msg)
    if (whatMusicCache.size > 200) whatMusicCache.clear()

    return conn.sendMessage(m.chat, msg, { quoted: m })

  } catch (e) {
    return m.reply(`Error: ${e.message}`)
  }
}

handler.help = ['whatmusic', 'shazam']
handler.tags = ['tools']
handler.command = ['whatmusic', 'shazam']

export default handler