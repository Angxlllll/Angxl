import {
  getContentType,
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

function unwrap(m) {
  let n = m
  while (n) {
    const next =
      n.viewOnceMessage?.message ||
      n.viewOnceMessageV2?.message ||
      n.viewOnceMessageV2Extension?.message ||
      n.ephemeralMessage?.message
    if (!next) break
    n = next
  }
  return n
}

async function streamToBuffer(stream) {
  if (!stream) return Buffer.alloc(0)
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

const getMentionData = (participants, conn) => {
  if (!Array.isArray(participants)) return { text: '', jids: [] }

  const jids = participants
    .map(p => conn.decodeJid(p.id))
    .filter(jid => jid && jid !== conn.user.id)

  const text = jids
    .map(jid => `@${jid.split('@')[0]}`)
    .join(' ')

  return { text, jids }
}

const handler = async (m, { conn, args, participants }) => {
  const textInput = args.join(' ')
  const root = unwrap(m.message)

  const { text: mentionText, jids } = getMentionData(participants, conn)

  let source = null
  let sourceType = null

  if (root) {
    sourceType = getContentType(root)
    if (
      sourceType &&
      sourceType !== 'conversation' &&
      sourceType !== 'extendedTextMessage'
    ) {
      source = root[sourceType]
    }
  }

  if (!source && m.quoted) {
    const q = unwrap(m.quoted.message)
    if (q) {
      sourceType = getContentType(q)
      if (
        sourceType &&
        sourceType !== 'conversation' &&
        sourceType !== 'extendedTextMessage'
      ) {
        source = q[sourceType]
      } else {
        const qtext =
          q.conversation ||
          q.extendedTextMessage?.text

        if (qtext) {
          return conn.sendMessage(
            m.chat,
            {
              text: `${mentionText}\n\n${qtext}`,
              contextInfo: {
                mentionedJid: jids
              }
            },
            { quoted: m }
          )
        }
      }
    }
  }

  if (!source && textInput) {
    return conn.sendMessage(
      m.chat,
      {
        text: `${mentionText}\n\n${textInput}`,
        contextInfo: {
          mentionedJid: jids
        }
      },
      { quoted: m }
    )
  }

  if (!source) {
    return m.reply(
      '❌ *Uso incorrecto*\n\n• `.n texto`\n• Responde a un mensaje con `.n`'
    )
  }

  const media = await streamToBuffer(
    await downloadContentFromMessage(
      source,
      sourceType.replace('Message', '')
    )
  )

  let payload

  if (sourceType === 'audioMessage') {
    payload = {
      audio: media,
      mimetype: source.mimetype || 'audio/mpeg',
      ptt: false
    }
  } else {
    payload = {
      [sourceType.replace('Message', '')]: media,
      caption: `${mentionText}\n\n${textInput || ''}`
    }
  }

  await conn.sendMessage(
    m.chat,
    {
      ...payload,
      contextInfo: {
        mentionedJid: jids
      }
    },
    { quoted: m }
  )
}

handler.command = ['n', 'tag', 'notify']
handler.group = true
handler.admin = true
handler.needParticipants = true
handler.help = ['Notify']
handler.tags = ['Grupos']

export default handler