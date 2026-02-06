import fetch from 'node-fetch'
import yts from 'yt-search'
import Jimp from 'jimp'
import axios from 'axios'

async function resizeImage(buffer, size = 300) {
  try {
    const img = await Jimp.read(buffer)
    return img.resize(size, size).getBufferAsync(Jimp.MIME_JPEG)
  } catch {
    return buffer
  }
}

const savenowApi = {
  key: 'dfcb6d76f2f6a9894gjkege8a4ab232222',
  agent: 'Mozilla/5.0 (Android 13)',
  referer: 'https://y2down.cc/enSB/',

  async ytdl(url, format) {
    const res = await fetch(
      `https://p.savenow.to/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(url)}&api=${this.key}`,
      { headers: { 'User-Agent': this.agent, Referer: this.referer } }
    )
    const json = await res.json()
    if (!json.success) return null

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500))
      const p = await fetch(`https://p.savenow.to/api/progress?id=${json.id}`)
      const j = await p.json()
      if (j.progress === 1000) return j.download_url
    }
    return null
  },

  async download(url) {
    return (
      await this.ytdl(url, 'mp3') ||
      await this.ytdl(url, 'm4a')
    )
  }
}

async function downloadWithFallback(url) {
  let link = await savenowApi.download(url)
  if (link) return link

  try {
    const r = await axios.get(
      `https://scrapers.hostrta.win/scraper/24?url=${encodeURIComponent(url)}`,
      { timeout: 15000 }
    )
    return r.data?.audio?.url || null
  } catch {}

  try {
    const r = await axios.get(
      `https://youtube-downloader-api.vercel.app/info?url=${encodeURIComponent(url)}`,
      { timeout: 10000 }
    )
    return r.data?.data?.formats?.find(f => f.mimeType?.includes('audio'))?.url || null
  } catch {}

  return null
}

const handler = async (m, { conn, args }) => {
  const query = args.join(' ')
  if (!query) {
    return m.reply(
      '❗ Usa el comando así:\n\n.play nombre de la canción'
    )
  }

  m.reply('⏳ Descargando audio...')

  try {
    const search = await yts(query)
    const video = search.videos?.[0]
    if (!video) throw 'No encontré resultados'

    const audioUrl = await downloadWithFallback(video.url)
    if (!audioUrl) throw 'No pude descargar el audio'

    const thumb = await resizeImage(
      await (await fetch(video.thumbnail)).buffer()
    )

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`,
        jpegThumbnail: thumb
      },
      { quoted: m }
    )
  } catch (e) {
    return m.reply(
      typeof e === 'string' ? e : '❌ Error al descargar'
    )
  }
}

handler.help = ['play']
handler.tags = ['descargas']
handler.command = ['play']

export default handler