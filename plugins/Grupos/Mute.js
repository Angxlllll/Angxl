import fs from 'fs/promises'

const OWNER_LID = ['159606034665538@lid', '205819731832938@lid']
const DB_DIR = './database'
const DATA_FILE = `${DB_DIR}/muted.json`

await fs.mkdir(DB_DIR, { recursive: true })

let mutedData = {}
try {
  mutedData = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'))
} catch {
  await fs.writeFile(DATA_FILE, JSON.stringify({}, null, 2))
}

const save = async () => {
  for (const k in mutedData)
    if (!Array.isArray(mutedData[k]) || !mutedData[k].length)
      delete mutedData[k]

  await fs.writeFile(DATA_FILE, JSON.stringify(mutedData, null, 2))
}

const THUMB_CACHE = Object.create(null)
const getThumb = async url => {
  if (THUMB_CACHE[url]) return THUMB_CACHE[url]
  try {
    const buf = await (await fetch(url)).arrayBuffer()
    return (THUMB_CACHE[url] = Buffer.from(buf))
  } catch {
    return null
  }
}

const handler = async (m, { conn, command }) => {
  const user =
    m.mentionedJid?.[0] ||
    m.quoted?.sender

  if (!user)
    return m.reply('⚠️ Usa *.mute @usuario* o responde a su mensaje')

  if (user === m.sender)
    return m.reply('❌ No puedes mutearte a ti mismo')

  if (user === conn.user.jid)
    return m.reply('🤖 No puedes mutear al bot')

  if (OWNER_LID.includes(user))
    return m.reply('👑 No puedes mutear a un Owner')

  mutedData[m.chat] ||= []

  const isMute = command === 'mute'
  const exists = mutedData[m.chat].includes(user)

  if (isMute && exists) return
  if (!isMute && !exists) return

  const img = isMute
    ? 'https://telegra.ph/file/f8324d9798fa2ed2317bc.png'
    : 'https://telegra.ph/file/aea704d0b242b8c41bf15.png'

  const thumb = await getThumb(img)
  const name = await conn.getName(user).catch(() => 'Usuario')

  if (isMute) mutedData[m.chat].push(user)
  else mutedData[m.chat] = mutedData[m.chat].filter(v => v !== user)

  await save()

  await conn.sendMessage(
    m.chat,
    {
      text: `${isMute ? '🔇' : '🔊'} *${name}* fue ${isMute ? 'muteado' : 'desmuteado'}`,
      mentions: [user]
    },
    {
      quoted: {
        key: {
          fromMe: false,
          participant: '0@s.whatsapp.net',
          remoteJid: m.chat
        },
        message: {
          locationMessage: {
            name: isMute ? 'Usuario muteado' : 'Usuario desmuteado',
            jpegThumbnail: thumb
          }
        }
      }
    }
  )
}

handler.before = async (m, { conn, isCommand }) => {
  if (!m.isGroup) return
  if (m.fromMe) return
  if (OWNER_LID.includes(m.sender)) return
  if (isCommand) return

  const list = mutedData[m.chat]
  if (!list || !list.includes(m.sender)) return

  await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
  return true
}

handler.command = ['mute', 'unmute']
handler.group = true
handler.admin = true
export default handler