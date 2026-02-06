import yts from 'yt-search'
import fetch from 'node-fetch'

const STELLAR_URL = 'https://api.stellarwa.xyz'
const KEYS = [
  'DiegoJadiBot',
  '1bcd4698ce6c75217275c9607f01fd99'
]

function pickKey(i) {
  return KEYS[i % KEYS.length]
}

async function stellarAudio(url, key) {
  const res = await fetch(
    `${STELLAR_URL}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${key}`,
    { timeout: 10000 }
  )
  const json = await res.json()
  return json?.data?.dl || null
}

async function raceDownload(url) {
  return new Promise(async (resolve, reject) => {
    let done = false
    let fails = 0

    for (let i = 0; i < KEYS.length; i++) {
      stellarAudio(url, pickKey(i))
        .then(link => {
          if (done || !link) return
          done = true
          resolve(link)
        })
        .catch(() => {
          fails++
          if (fails === KEYS.length && !done) {
            reject('No se pudo descargar el audio')
          }
        })
    }
  })
}

const handler = async (m, { conn, args }) => {
  const text = args.join(' ')
  if (!text) {
    return m.reply('❗ Usa:\n.play nombre de la canción')
  }

  let video
  try {
    const search = await yts(text)
    video = search.videos?.[0]
    if (!video) throw 0
  } catch {
    return m.reply('❌ No encontré resultados')
  }

  m.reply('⏳ Descargando audio...')

  let audioUrl
  try {
    audioUrl = await raceDownload(video.url)
  } catch {
    return m.reply('❌ Error al descargar el audio')
  }

  await conn.sendMessage(
    m.chat,
    {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${video.title}.mp3`
    },
    { quoted: m }
  )
}

handler.command = ['play']
handler.tags = ['downloader']
handler.help = ['play <texto>']

export default handler