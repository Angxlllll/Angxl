import {
  getContentType,
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

const handler = async (m, { conn, args, participants }) => {

  let messageToSend = null
  let quotedOption = null

  const quoted =
    m.quoted?.message ||
    null

  if (quoted) {
    const type = getContentType(quoted)

    if (type === 'conversation') {
      messageToSend = { text: quoted.conversation }
      quotedOption = { quoted: m.quoted }
    } else if (type === 'extendedTextMessage') {
      messageToSend = { text: quoted.extendedTextMessage.text }
      quotedOption = { quoted: m.quoted }
    } else {
      const stream = await downloadContentFromMessage(
        quoted[type],
        type.replace('Message', '')
      )

      let buffer = Buffer.alloc(0)
      for await (const c of stream) buffer = Buffer.concat([buffer, c])

      messageToSend = { [type.replace('Message', '')]: buffer }
    }
  }

  if (!messageToSend && args.length) {
    messageToSend = { text: args.join(' ') }
  }

  if (!messageToSend) {
    return m.reply(
      '❌ *Uso incorrecto*\n\n' +
      '• `.n texto`\n' +
      '• Responde a un mensaje con `.n`'
    )
  }

  await m.react('🗣️')

  await conn.sendMessage(
    m.chat,
    {
      ...messageToSend,
      mentions: participants.map(p => p.id),
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true
      }
    },
    quotedOption
  )
}

handler.command = ['n', 'tag', 'notify']
handler.group = true
handler.admin = true

export default handler