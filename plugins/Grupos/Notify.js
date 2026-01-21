import {
  getContentType,
  downloadContentFromMessage
} from "@whiskeysockets/baileys"

function unwrapMessage(m) {
  let n = m
  while (
    n?.viewOnceMessage?.message ||
    n?.viewOnceMessageV2?.message ||
    n?.viewOnceMessageV2Extension?.message ||
    n?.ephemeralMessage?.message
  ) {
    n =
      n.viewOnceMessage?.message ||
      n.viewOnceMessageV2?.message ||
      n.viewOnceMessageV2Extension?.message ||
      n.ephemeralMessage?.message
  }
  return n
}

function getQuoted(msg) {
  const root = unwrapMessage(msg.message) || {}
  const ctx =
    root?.extendedTextMessage?.contextInfo ||
    root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo ||
    root?.audioMessage?.contextInfo ||
    root?.stickerMessage?.contextInfo ||
    root?.documentMessage?.contextInfo ||
    null

  return ctx?.quotedMessage
    ? unwrapMessage(ctx.quotedMessage)
    : null
}

const handler = async (m, { conn, args, participants = [] }) => {

  let messageToSend = null
  const quoted = getQuoted(m)

  if (quoted) {
    const type = getContentType(quoted)

    if (type === 'conversation' || type === 'extendedTextMessage') {
      messageToSend = {
        text:
          quoted.conversation ||
          quoted.extendedTextMessage?.text
      }
    } else {
      const stream = await downloadContentFromMessage(
        quoted[type],
        type.replace("Message", "")
      )

      let buffer = Buffer.alloc(0)
      for await (const c of stream) buffer = Buffer.concat([buffer, c])

      messageToSend = { [type.replace("Message", "")]: buffer }
    }
  }

  if (!messageToSend && args.length) {
    messageToSend = { text: args.join(" ") }
  }

  if (!messageToSend) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          "❌ *Uso incorrecto*\n\n" +
          "• `.n texto`\n" +
          "• Responde a un mensaje con `.n`"
      },
      { quoted: m }
    )
  }

  await conn.sendMessage(m.chat, {
    ...messageToSend,
    mentions: participants.map(p => p.id)
  })
}

handler.command = ["n", "tag", "notify"]
handler.group = true
handler.admin = true

export default handler