import {
  getContentType,
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

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

function unwrapMessage(m) {
  let n = m
  while (
    n?.viewOnceMessage?.message ||
    n?.viewOnceMessageV2?.message ||
    n?.viewOnceMessageV2Extension?.message ||
    n?.ephemeralMessage?.message
  ) {
    n =
      n.viewOnceMessage?.message ||
      n.viewOnceMessageV2?.message ||
      n.viewOnceMessageV2Extension?.message ||
      n.ephemeralMessage?.message
  }
  return n
}

function getQuoted(msg) {
  const root = unwrapMessage(msg.message)
  const ctx = root?.extendedTextMessage?.contextInfo
  return ctx?.quotedMessage
    ? unwrapMessage(ctx.quotedMessage)
    : null
}

async function streamToBuffer(stream) {
  let buffer = Buffer.alloc(0)
  for await (const c of stream) buffer = Buffer.concat([buffer, c])
  return buffer
}

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    await conn.sendMessage(m.chat, {
      react: { text: '🕒', key: m.key }
    })

    const direct = unwrapMessage(m.message)
    const quoted = getQuoted(m)

    let content = null
    let type = null

    if (direct) {
      const t = getContentType(direct)
      if (t === 'audioMessage' || t === 'videoMessage') {
        content = direct[t]
        type = t
      }
    }

    if (!content && quoted) {
      const t = getContentType(quoted)
      if (t === 'audioMessage' || t === 'videoMessage') {
        content = quoted[t]
        type = t
      }
    }

    if (!content) {
      return m.reply(`Envía o responde a un audio o video con ${usedPrefix + command}`)
    }

    const seconds = content.seconds || 0
    if (seconds > 180) {
      return m.reply(`Máximo 3 minutos. El tuyo dura ${seconds}s.`)
    }

    const stream = await downloadContentFromMessage(
      content,
      type.replace('Message', '')
    )

    const buffer = await streamToBuffer(stream)
    if (!buffer.length) return m.reply('No pude descargar el archivo.')

    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    if (whatMusicCache.has(hash)) {
      return conn.sendMessage(m.chat, whatMusicCache.get(hash), { quoted: m })
    }

    const result = await acr.identify(buffer).catch(() => null)
    if (!result || result.status?.code !== 0) {
      return m.reply(result?.status?.msg || 'No se pudo identificar.')
    }

    const music = result.metadata?.music?.[0]
    if (!music) return m.reply('No se encontró coincidencia.')

    const title = music.title || 'Desconocido'
    const artist = music.artists?.map(a => a.name).join(', ') || 'Desconocido'
    const album = music.album?.name
    const genres = music.genres?.map(g => g.name).join(', ')
    const release = music.release_date || 'Desconocido'

    let text =
`┏╾❑「 WhatMusic 」
┃ 🎵 Título: ${title}
┃ 👤 Artista: ${artist}`

    if (album) text += `\n┃ 💿 Álbum: ${album}`
    if (genres) text += `\n┃ 🎼 Género: ${genres}`

    text += `\n┃ 📅 Lanzamiento: ${release}\n`

    const search = await yts(`${title} ${artist}`).catch(() => null)
    const video = search?.videos?.find(v => v.views > 500 && v.duration?.seconds < 600)

    let msg
    if (video) {
      text +=
`┃ ▶ YouTube: ${video.title}
┃ 📺 Canal: ${video.author?.name || 'Desconocido'}
┃ 👁 Vistas: ${video.views.toLocaleString()}
┃ ⏱ Duración: ${video.timestamp}
┃ 🔗 ${video.url}
┗╾❑`

      const res = await fetch(video.thumbnail)
      const img = Buffer.from(await res.arrayBuffer())

      msg = { image: img, caption: text }
    } else {
      text += '┗╾❑'
      msg = { text }
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