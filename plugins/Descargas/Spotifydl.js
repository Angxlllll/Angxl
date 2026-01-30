import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import * as cheerio from 'cheerio'

const jar = new CookieJar()
const client = wrapper(axios.create({ jar }))

const BASE_URL = 'https://spotmate.online'
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://spotmate.online/en1',
  Origin: 'https://spotmate.online'
}

async function scrapeSpotify(spotifyUrl) {
  try {
    const homeResponse = await client.get(`${BASE_URL}/en1`, {
      headers: HEADERS
    })

    const $ = cheerio.load(homeResponse.data)
    const csrfToken = $('meta[name="csrf-token"]').attr('content')

    if (!csrfToken) {
      throw new Error('Could not find CSRF token')
    }

    const apiHeaders = {
      ...HEADERS,
      'X-CSRF-TOKEN': csrfToken,
      'Content-Type': 'application/json'
    }

    const metaPayload = { spotify_url: spotifyUrl }
    const metaResponse = await client.post(`${BASE_URL}/getTrackData`, metaPayload, {
      headers: apiHeaders
    })

    const meta = metaResponse.data

    let name = 'Unknown'
    let cover = ''
    if (meta) {
      if (meta.name) {
        const artist = meta.artists && meta.artists.length > 0 ? meta.artists[0].name : ''
        name = artist ? `${meta.name} - ${artist}` : meta.name
      }
      cover = meta.album?.images?.[0]?.url || ''
    }

    const convertPayload = { urls: spotifyUrl }
    const convertResponse = await client.post(`${BASE_URL}/convert`, convertPayload, {
      headers: apiHeaders
    })

    const convertData = convertResponse.data

    if (convertData.status === 'queued' && convertData.task_id) {
      const taskId = convertData.task_id
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000))

        try {
          const checkRes = await client.post(
            `${BASE_URL}/status`,
            { taskId: taskId },
            { headers: apiHeaders }
          )
          const checkData = checkRes.data

          if (checkData.status === 'success' || checkData.status === 'finished') {
            const dl = checkData.download || checkData.url || checkData.result
            if (dl) {
              return {
                name,
                cover,
                path: dl
              }
            }
          }
        } catch (e) {
          // ignore poller errors
        }
      }
      return { error: 'Timeout waiting for conversion' }
    }

    if (!convertData || convertData.error) {
      return { error: 'Conversion failed', detail: convertData }
    }

    return {
      name,
      cover,
      path: convertData.url || convertData.download
    }
  } catch (error) {
    return { error: error.message }
  }
}

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const url = (text?.trim() || args?.[0] || '').trim()
  if (!url) return m.reply(`Uso: ${usedPrefix + command} <link de spotify>`)

  if (!/spotify\.com/.test(url)) {
    return m.reply('❌ Link inválido. Solo se soportan links de Spotify.')
  }

  await m.react('⏳').catch(() => {})

  try {
    const result = await scrapeSpotify(url)

    if (result.error || !result.path) {
      await m.react('✖️').catch(() => {})
      return m.reply(`Error descargando canción: ${result.error || 'Desconocido'}`)
    }

    const caption = `🎵 *${result.name}*\n🔗 Link: ${url}`


    const contextInfo = {
      externalAdReply: {
        title: result.name,
        body: 'Spotify Downloader',
        thumbnailUrl: result.cover || undefined,
        sourceUrl: url,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: result.path },
        mimetype: 'audio/mpeg',
        contextInfo
      },
      { quoted: m }
    )

    await m.react('✅').catch(() => {})
  } catch (e) {
    console.error(e)
    await m.react('✖️').catch(() => {})
    m.reply(`Error: ${e.message || e}`)
  }
}

handler.help = ['spotify <url>']
handler.tags = ['dl']
handler.command = ['spotifydl', 'sp2']

export default handler
