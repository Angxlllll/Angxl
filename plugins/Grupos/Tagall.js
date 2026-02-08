import { decodeJid } from '../../lib/simple.js'

const FLAGS = {
  '1': '🇺🇸',
  '52': '🇲🇽',
  '54': '🇦🇷',
  '55': '🇧🇷',
  '56': '🇨🇱',
  '57': '🇨🇴',
  '58': '🇻🇪',
  '51': '🇵🇪',
  '34': '🇪🇸',
  '33': '🇫🇷',
  '49': '🇩🇪',
  '44': '🇬🇧'
}

const PREFIXES = Object.keys(FLAGS).sort((a, b) => b.length - a.length)

const getFlagFromJid = jid => {
  if (!jid.endsWith('@s.whatsapp.net')) return '🏳️'
  const num = jid.split('@')[0]
  for (const p of PREFIXES) {
    if (num.startsWith(p)) return FLAGS[p]
  }
  return '🏳️'
}

const MAX = 5

const handler = async (m, { conn }) => {
  if (!m.isGroup) return

  const meta = await conn.groupMetadata(m.chat)
  const members = meta.participants

  const mentions = []
  const lines = []

  for (const p of members) {
    if (mentions.length >= MAX) break

    const jid = decodeJid(p.id)
    if (!jid.endsWith('@s.whatsapp.net')) continue

    const num = jid.split('@')[0]
    const flag = getFlagFromJid(jid)

    mentions.push(jid)
    lines.push(`┊» ${flag} @${num}`)
  }

  if (!mentions.length) return

  const text =
`🗣️ MENCIÓN GENERAL

${lines.join('\n')}`

  await conn.sendMessage(
    m.chat,
    { text, mentions },
    { quoted: m }
  )
}

handler.help = ['todos']
handler.tags = ['grupos']
handler.command = ['todos']
handler.group = true
handler.admin = true

export default handler