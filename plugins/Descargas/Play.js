import fetch from 'node-fetch'
import yts from 'yt-search'

const DL_CACHE = new Map()
const CACHE_TTL = 10 * 60_000

function cacheGet(k) {
  const v = DL_CACHE.get(k)
  if (!v) return null
  if (Date.now() - v.t > CACHE_TTL) {
    DL_CACHE.delete(k)
    return null
  }
  return v.url
}

function cacheSet(k, url) {
  DL_CACHE.set(k, { url, t: Date.now() })
}

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise(r => setTimeout(() => r(null), ms))
  ])
}

const savenow = async url => {
  const res = await fetch(`https://p.savenow.to/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}`)
  const json = await res.json()
  if (!json?.id) return null

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500))
    const p = await fetch(`https://p.savenow.to/api/progress?id=${json.id}`)
    const j = await p.json()
    if (j?.download_url) return j.download_url
  }
  return null
}

const backup = async url => {
  const r = await fetch(`https://youtube-downloader-api.vercel.app/info?url=${encodeURIComponent(url)}`)
  const j = await r.json()
  if (!j?.success) return null
  const a = j.data.formats.find(f => f.mimeType?.includes('audio'))
  return a?.url || null
}

async function race(url) {
  return new Promise(resolve => {
    let done = false
    const finish = u => {
      if (!done && u) {
        done = true
        resolve(u)
      }
    }

    withTimeout(savenow(url), 9000).then(finish)
    withTimeout(backup(url), 7000).then(finish)

    setTimeout(() => resolve(null), 10_000)
  })
}

const handler = async (m, { args, usedPrefix }) => {
  const text = args.join(' ')
  if (!text) return m.reply(`Uso correcto:\n${usedPrefix}play bad bunny`)

  const search = await yts(text)
  const video = search.videos?.[0]
  if (!video) return m.reply('No se encontraron resultados')

  const cacheKey = `yt:${video.videoId}`
  let url = cacheGet(cacheKey)

  if (!url) {
    url = await race(video.url)
    if (!url) return m.reply('No se pudo descargar el audio')
    cacheSet(cacheKey, url)
  }

  await m.reply(`Descargando:\n${video.title}`)

  await this.sendMessage(m.chat, {
    audio: { url },
    mimetype: 'audio/mpeg',
    fileName: `${video.title}.mp3`
  }, { quoted: m })
}

handler.command = ['play']
handler.tags = ['descargas']
handler.help = ['play <texto>']
handler.group = false
handler.register = false

export default handler