import fetch from 'node-fetch'
import yts from 'yt-search'

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

    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1200))
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

async function fastBackup(url) {
  try {
    const r = await fetch(
      `https://youtube-downloader-api.vercel.app/info?url=${encodeURIComponent(url)}`
    )
    const j = await r.json()
    return j?.data?.formats?.find(f => f.mimeType?.includes('audio'))?.url || null
  } catch {
    return null
  }
}

async function raceDownload(url) {
  const tasks = [
    savenowApi.download(url),
    fastBackup(url)
  ]

  return new Promise((resolve, reject) => {
    let done = false
    let fails = 0

    for (const p of tasks) {
      p.then(r => {
        if (done || !r) return
        done = true
        resolve(r)
      }).catch(() => {
        if (++fails === tasks.length && !done) {
          reject('No se pudo descargar')
        }
      })
    }
  })
}

const handler = async (m, { conn, args }) => {
  const query = args.join(' ')
  if (!query) {
    return m.reply('❗ Usa:\n.play nombre de la canción')
  }

  await m.reply('⏳ Descargando audio...')

  try {
    const search = await yts(query)
    const video = search.videos?.[0]
    if (!video) throw 'Sin resultados'

    const audioUrl = await raceDownload(video.url)
    if (!audioUrl) throw 'No se pudo obtener el audio'

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`
      },
      { quoted: m }
    )
  } catch (e) {
    return m.reply(
      typeof e === 'string' ? e : '❌ Error'
    )
  }
}

handler.help = ['play']
handler.tags = ['descargas']
handler.command = ['play']

export default handler