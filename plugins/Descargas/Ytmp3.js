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
      return { success: false, error: 'No se pudo obtener el token de captcha' }
    }

    const captchaToken = cfResponse.result

    const convertApiUrl = 'https://ezconv.cc/api/convert'
    const convertPayload = {
      url: videoUrl,
      quality: '320',
      trim: false,
      startT: 0,
      endT: 0,
      captchaToken
    }

    const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    })

    if (convertResponse.status !== 'done') {
      return { success: false, error: `La conversión falló. Estado: ${convertResponse.status}` }
    }

    return {
      success: true,
      data: {
        title: convertResponse.title,
        downloadUrl: convertResponse.url,
        status: convertResponse.status,
        quality: '320kbps'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data ? JSON.stringify(error.response.data) : error.message
    }
  }
}

async function searchMusicByName(query) {
  try {
    const search = await yts(query)
    if (!search.videos || !search.videos.length) {
      return { success: false, error: 'No se encontraron resultados' }
    }

    const video = search.videos[0]
    return {
      success: true,
      data: {
        title: video.title,
        url: video.url,
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        duration: video.timestamp,
        channel: video.author.name,
        views: video.views.toLocaleString()
      }
    }
  } catch {
    return { success: false, error: 'Error en la búsqueda' }
  }
}

let handler = async (m, { conn, args }) => {
  const userId = m.sender

  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId)
    const remaining = expire - Date.now()
    if (remaining > 0) {
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`)
    }
  }

  if (!args[0]) {
    return m.reply('🎵 *Usa:* .play <nombre de canción>')
  }

  const searchQuery = args.join(' ')
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME)

  try {
    const searchMsg = await m.reply(`🔍 *Buscando:* "${searchQuery}"`)

    const searchResult = await searchMusicByName(searchQuery)
    if (!searchResult.success) {
      cooldowns.delete(userId)
      await conn.sendMessage(m.chat, { text: '❌ No se encontró el video', edit: searchMsg.key })
      return
    }

    const { title, url, duration, channel, views } = searchResult.data

    await conn.sendMessage(m.chat, {
      text: `🎵 ${title}\n👤 ${channel}\n⏱️ ${duration}\n👁️ ${views}`,
      edit: searchMsg.key
    })

    const audioResult = await downloadYoutubeAudio(url)
    if (!audioResult.success) {
      cooldowns.delete(userId)
      await conn.sendMessage(m.chat, { text: audioResult.error, edit: searchMsg.key })
      return
    }

    const { downloadUrl, quality } = audioResult.data
    const cleanTitle = title.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '').substring(0, 50).trim()
    const fileName = `${cleanTitle}.mp3`

    const audioResponse = await fetch(downloadUrl)
    const audioBuffer = await audioResponse.buffer()

    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName,
      caption: `${title}\n${quality}`,
      quoted: m
    })

    setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME)
  } catch (error) {
    cooldowns.delete(userId)
    await m.reply(error.message)
  }
}

let handler2 = async (m, { conn, args }) => {
  const userId = m.sender

  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId)
    const remaining = expire - Date.now()
    if (remaining > 0) {
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`)
    }
  }

  if (!args[0]) {
    return m.reply('🎵 *Usa:* .ytmp3 <URL>')
  }

  let videoUrl = args[0]
  if (!videoUrl.match(/(youtube\.com|youtu\.be)/)) {
    return m.reply('❌ URL inválida')
  }

  if (videoUrl.includes('youtu.be/')) {
    const id = videoUrl.split('youtu.be/')[1].split('?')[0]
    videoUrl = `https://www.youtube.com/watch?v=${id}`
  }

  cooldowns.set(userId, Date.now() + COOLDOWN_TIME)

  try {
    const processingMsg = await m.reply('Procesando...')
    const result = await downloadYoutubeAudio(videoUrl)

    if (!result.success) {
      cooldowns.delete(userId)
      await conn.sendMessage(m.chat, { text: result.error, edit: processingMsg.key })
      return
    }

    const { title, downloadUrl, quality } = result.data
    const cleanTitle = title.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '').substring(0, 50).trim()
    const fileName = `${cleanTitle}.mp3`

    const audioResponse = await fetch(downloadUrl)
    const audioBuffer = await audioResponse.buffer()

    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName,
      caption: `${title}\n${quality}`,
      quoted: m
    })

    setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME)
  } catch (error) {
    cooldowns.delete(userId)
    await m.reply(error.message)
  }
}

handler.help = ['play']
handler.tags = ['dl', 'audio']
handler.command = ['ply', 'pa', 'musica'];

handler2.help = ['ytmp3 <url>']
handler2.tags = ['dl', 'audio']
handler2.command = ['ytmp3', 'yta', 'ytaudio']

export default handler
export { handler2 }