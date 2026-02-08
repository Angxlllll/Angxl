import { decodeJid } from '../../lib/simple.js'

const FLAGS = {
  '52': '🇲🇽',
  '1': '🇺🇸',
  '54': '🇦🇷',
  '55': '🇧🇷',
  '56': '🇨🇱',
  '57': '🇨🇴',
  '58': '🇻🇪',
  '51': '🇵🇪'
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

const handler = async (m, { conn }) => {
  // ⚡ feedback inmediato
  conn.sendMessage(m.chat, { react: { text: '🗣️', key: m.key } }).catch(() => {})

  // 🧠 solo menciona al que ejecuta (garantizado)
  const jid = decodeJid(m.sender)
  const num = jid.split('@')[0]

  const text =
`🗣️ MENCIÓN RÁPIDA

┊» ${getFlag(jid)} @${num}`

  conn.sendMessage(
    m.chat,
    { text, mentions: [jid] },
    { quoted: m }
  )
}

handler.command = ['todos']
handler.group = true

export default handler