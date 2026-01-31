import fetch from 'node-fetch'

const ALLOWED_MENTIONS = [
  '5215911153853@s.whatsapp.net',
  '25856038715509@lid',
  '5215911153853'
]

let handler = async (m, { conn }) => {
  if (!m.text) return

  const mentioned = m.mentionedJid || []

  const textMention = m.text.match(/@(\d{5,})/g) || []
  const textMentionClean = textMention.map(v => v.replace('@', ''))

  const isAllowedMention =
    mentioned.some(jid => ALLOWED_MENTIONS.includes(jid)) ||
    textMentionClean.some(num => ALLOWED_MENTIONS.includes(num))

  if (!isAllowedMention) return

  let text = m.text.replace(/@\S+/g, '').trim()

  if (!text) return m.reply('hola si')

  const systemPrompt = `
Eres Angel Bot, un asistente maso menos serio y burlón.
- Si el mensaje contiene groserías, responde igual de grosero e insultante.
- Si no contiene groserías, responde amistoso e ingenioso.
- Si preguntan quién te creó, responde: "Por Angel, el mejor UwU".
  `

  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai&system=${encodeURIComponent(systemPrompt)}`

    const res = await fetch(apiUrl)
    if (!res.ok) throw new Error('Pollinations error')

    const reply = await res.text()
    await m.reply(reply)

  } catch (e) {
    console.error(e)
    await m.reply('❌ Error con la IA')
  }
}

handler.customPrefix = /^@/i
handler.command = new RegExp
handler.help = ['@𝖡𝗈𝗍']
handler.tags = ['𝖬𝖤𝖳𝖠 𝖨𝖠']

export default handler