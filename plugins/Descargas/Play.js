import axios from 'axios'
import fetch from 'node-fetch'
import yts from 'yt-search'

const cooldowns = new Map()
const COOLDOWN_TIME = 30 * 1000

async function downloadYoutubeAudio(videoUrl) {
  try {
    const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile'
    const cfPayload = {
      url: 'https://ezconv.cc',
      siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
    }

    const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload)

    if (!cfResponse.success || !cfResponse.result) {
      return { success: false, error: 'No se pudo obtener token captcha' }
    }

    const convertApiUrl = 'https://ds1.ezsrv.net/api/convert'
    const convertPayload = {
      url: videoUrl,
      quality: '320',
      trim: false,
      startT: 0,
      endT: 0,
      captchaToken: cfResponse.result
    }

    const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    })

    if (convertResponse.status !== 'done') {
      return { success: false, error: 'Falló la conversión' }
    }

    return {
      success: true,
      data: {
        title: convertResponse.title,
        downloadUrl: convertResponse.url,
        quality: '320kbps'
      }
    }

  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function searchMusicByName(query) {
  try {
    const search = await yts(query)
    if (!search.videos.length) {
      return { success: false }
    }

    const v = search.videos[0]
    return {
      success: true,
      data: {
        title: v.title,
        url: v.url,
        thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        duration: v.timestamp,
        channel: v.author.name,
        views: v.views.toLocaleString()
      }
    }
  } catch {
    return { success: false }
  }
}

let handler = async (m, { conn, args }) => {
  const user = m.sender
  const chat = m.chat

  if (cooldowns.has(user) && cooldowns.get(user) > Date.now()) {
    return conn.sendMessage(chat, { text: '⏳ Espera un poco antes de usar el comando otra vez' }, { quoted: m })
  }

  if (!args.length) {
    return conn.sendMessage(chat, { text: 'Usa .play <nombre de canción>' }, { quoted: m })
  }

  cooldowns.set(user, Date.now() + COOLDOWN_TIME)

  const search = await searchMusicByName(args.join(' '))
  if (!search.success) {
    cooldowns.delete(user)
    return conn.sendMessage(chat, { text: 'No se encontró nada' }, { quoted: m })
  }

  const { title, url, duration, channel } = search.data

  const audio = await downloadYoutubeAudio(url)
  if (!audio.success) {
    cooldowns.delete(user)
    return conn.sendMessage(chat, { text: '❌ Error al obtener el audio' }, { quoted: m })
  }

  const res = await fetch(audio.data.downloadUrl)
  if (!res.ok) throw new Error('Error al descargar')

  const buffer = await res.buffer()

  await conn.sendMessage(chat, {
    audio: buffer,
    mimetype: 'audio/mpeg',
    fileName: `${title}.mp3`,
    caption: `🎵 ${title}\n👤 ${channel}\n⏱ ${duration}`
  }, { quoted: m })

  setTimeout(() => cooldowns.delete(user), COOLDOWN_TIME)
}

handler.help = ['play']
handler.tags = ['dl']
handler.command = ['play']

export default handler