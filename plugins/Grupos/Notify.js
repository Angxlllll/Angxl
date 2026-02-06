import {
  getContentType,
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

async function streamToBuffer(stream) {
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

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
    root.extendedTextMessage?.contextInfo ||
    root.imageMessage?.contextInfo ||
    root.videoMessage?.contextInfo ||
    root.documentMessage?.contextInfo ||
    root.audioMessage?.contextInfo ||
    root.stickerMessage?.contextInfo ||
    null

  return ctx?.quotedMessage
    ? unwrapMessage(ctx.quotedMessage)
    : null
}

async function buildMessage(content, type, text) {
  if (type === 'conversation' || type === 'extendedTextMessage') {
    return {
      text:
        content.conversation ||
        content.extendedTextMessage?.text
    }
  }

  const buffer = await streamToBuffer(
    await downloadContentFromMessage(
      content[type],
      type.replace('Message', '')
    )
  )

  if (type === 'audioMessage') {
    return {
      audio: buffer,
      mimetype: content.audioMessage?.mimetype || 'audio/mpeg',
      ptt: false
    }
  }

  return {
    [type.replace('Message', '')]: buffer,
    caption: text || undefined
  }
}

const handler = async (m, { conn, args, participants = [] }) => {
  const text = args.join(' ').trim()
  let msg = null

  const direct = unwrapMessage(m.message)
  const directType = getContentType(direct)

  if (directType && !['conversation', 'extendedTextMessage'].includes(directType)) {
    msg = await buildMessage(direct, directType, text)
  } else {
    const quoted = getQuoted(m)
    if (quoted) {
      const type = getContentType(quoted)
      msg = await buildMessage({ [type]: quoted }, type, text)
    } else if (text) {
      msg = { text }
    }
  }

  if (!msg) {
    return m.reply(
      '❌ *Uso incorrecto*\n\n' +
      '• `.n texto`\n' +
      '• Responde a un mensaje con `.n`'
    )
  }

  await conn.sendMessage(
    m.chat,
    {
      ...msg,
      contextInfo: {
        mentionedJid: participants.map(p => p.id || p.jid)
      }
    },
    { quoted: m }
  )
}

handler.command = ['n', 'tag', 'notify']
handler.group = true
handler.admin = true
handler.help = ['notify']
handler.tags = ['grupos']

export default handler