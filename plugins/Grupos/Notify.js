const handler = async (m, { conn, args, participants }) => {
  let message = null

  // 1️⃣ Si hay mensaje citado → reenviar
  if (m.quoted) {
    if (m.quoted.text) {
      message = { text: m.quoted.text }
    } else {
      const buffer = await m.quoted.download()
      message = {
        [m.quoted.mtype.replace('Message', '')]: buffer
      }
    }
  }

  // 2️⃣ Si no hay quoted → usar texto del comando
  if (!message && args.length) {
    message = { text: args.join(' ') }
  }

  // 3️⃣ Si no hay nada → diálogo
  if (!message) {
    return m.reply(
      "❌ *Uso incorrecto*\n\n" +
      "• `.n texto`\n" +
      "• Responde a un mensaje con `.n`"
    )
  }

  // reacción correcta según tu simple/handler
  await conn.sendMessage(m.chat, {
    react: { text: '📢', key: m.key }
  })

  // 4️⃣ Notificación con menciones
  await conn.sendMessage(m.chat, {
    ...message,
    mentions: participants.map(p => p.id)
  })
}

handler.command = ['n', 'tag', 'notify']
handler.group = true
handler.admin = true

export default handler