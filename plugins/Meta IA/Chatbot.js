import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  if (!m.text) return

  // quita el @bot del inicio
  let text = m.text.replace(/^@\S*/i, '').trim()

  if (!text) return m.reply('hola si')

  const systemPrompt = `
Eres Angel Bot, un asistente maso menos serio y burlón.
- Si el mensaje contiene groserías, responde igual de grosero e insultante.
- Si no contiene groserías, responde amistoso, ingenioso y entretenido.
- Si preguntan quién te creó, responde SOLO: "Por Angel, el mejor UwU".
`

  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    const apiUrl =
      `https://text.pollinations.ai/${encodeURIComponent(text)}` +
      `?model=openai&system=${encodeURIComponent(systemPrompt)}`

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
handler.help = ['@bot']
handler.tags = ['𝖬𝖤𝖳𝖠 𝖨𝖠']

export default handler