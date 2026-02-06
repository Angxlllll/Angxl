import yts from 'yt-search'
import fetch from 'node-fetch'

const API_URL = 'https://api.stellarwa.xyz'
const API_KEY = 'Angxll'

async function getAudio(url) {
  const res = await fetch(
    `${API_URL}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${API_KEY}`,
    { timeout: 10000 }
  )
  const json = await res.json()
  return json?.data?.dl || null
}

const handler = async (m, { conn, args }) => {
  const text = args.join(' ')
  if (!text) return m.reply('❗ Usa:\n.play nombre')

  const search = await yts(text)
  const video = search.videos?.[0]
  if (!video) return m.reply('❌ No encontrado')

  const audioUrl = await getAudio(video.url)
  if (!audioUrl) return m.reply('❌ Error en la API')

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
export default handler