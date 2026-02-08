import { decodeJid } from '../../lib/simple.js'

const FLAGS = {
  '52': '🇲🇽',
  '1': '🇺🇸',
  '54': '🇦🇷',
  '55': '🇧🇷',
  '56': '🇨🇱',
  '57': '🇨🇴',
  '58': '🇻🇪',
  '51': '🇵🇪',
  '34': '🇪🇸'
}

const PREFIXES = Object.keys(FLAGS).sort((a, b) => b.length - a.length)
const MAX = 5

const getFlag = jid => {
  const num = jid.split('@')[0]
  for (const p of PREFIXES) {
    if (num.startsWith(p)) return FLAGS[p]
  }
  return '🏳️'
}

const handler = async (m, { conn, participants }) => {
  if (!participants || !participants.length) return

  const mentions = []
  const lines = []

  for (const p of participants) {
    if (mentions.length >= MAX) break

    const jid = decodeJid(p.id)
    if (!jid.endsWith('@s.whatsapp.net')) continue

    const num = jid.split('@')[0]

    mentions.push(jid)
    lines.push(`┊» ${getFlag(jid)} @${num}`)
  }

  if (!mentions.length) return

  conn.sendMessage(
    m.chat,
    {
      text: `🗣️ MENCIÓN GENERAL\n\n${lines.join('\n')}`,
      mentions
    },
    { quoted: m }
  )
}

handler.help = ['todos']
handler.tags = ['group']
handler.command = ['todos']

handler.group = true
handler.admin = true   // 🔥 OBLIGATORIO para participants
handler.botAdmin = false

export default handler