const handler = async (m, { conn, args, participants }) => {
  let message = null
  let options = {}

  if (m.quoted) {
    const quotedText =
      m.quoted.text ||
      m.quoted.msg?.conversation ||
      m.quoted.msg?.extendedTextMessage?.text

    if (quotedText) {
      message = { text: quotedText }
      options.quoted = m.quoted
    } else {
      const buffer = await m.quoted.download()
      const type = m.quoted.mtype.replace('Message', '')
      message = { [type]: buffer }
    }
  }

  if (!message && args.length) {
    message = { text: args.join(' ') }
  }

  if (!message) {
    return m.reply(
      "❌ *Uso incorrecto*\n\n" +
      "• `.n texto`\n" +
      "• Responde a un mensaje con `.n`"
    )
  }

  await conn.sendMessage(m.chat, {
    react: { text: '📢', key: m.key }
  })

  await conn.sendMessage(
    m.chat,
    {
      ...message,
      mentions: participants.map(p => p.id),
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true
      }
    },
    options
  )
}

handler.command = ['n', 'tag', 'notify']
handler.group = true
handler.admin = true

export default handler