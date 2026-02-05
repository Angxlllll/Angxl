import * as baileys from '@whiskeysockets/baileys'

const {
  makeWASocket: _makeWASocket,
  getContentType,
  downloadContentFromMessage,
  jidNormalizedUser
} = baileys

if (typeof _makeWASocket !== 'function') {
  throw new Error('[simple.js] Fork de Baileys incompatible')
}

export const delay = ms => new Promise(r => setTimeout(r, ms))

function normalize(jid) {
  try {
    return jidNormalizedUser(jid)
  } catch {
    return jid
  }
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

function normalizeType(type = '') {
  return type
    .replace('viewOnceMessageV2', '')
    .replace('viewOnceMessage', '')
    .replace('Message', '')
}

export function smsg(conn, m) {
  if (!m?.message) return m

  const key = m.key
  const msg = m.message
  const mtype = getContentType(msg)
  const content = msg[mtype] || {}

  m.id = key?.id
  m.chat = normalize(key?.remoteJid)
  m.fromMe = key?.fromMe
  m.isGroup = m.chat?.endsWith('@g.us')

  m.sender = normalize(
    m.fromMe ? conn.user?.id : key?.participant || m.chat
  )

  m.isBaileys = key?.id?.startsWith('BAE5')
  m.isBot = m.fromMe

  m.mtype = mtype
  m.msg = content
  m.mediaType = normalizeType(mtype)

  m.text =
    msg.conversation ||
    content.text ||
    content.caption ||
    content?.extendedTextMessage?.text ||
    ''

  m.body = m.text
  m.pushName = m.pushName || m.notifyName || ''
  m.mentionedJid = content.contextInfo?.mentionedJid || []

  const ctx = content.contextInfo
  if (ctx?.quotedMessage) {
    const qm = ctx.quotedMessage
    const qtype = getContentType(qm)
    const qcontent = qm[qtype] || {}

    m.quoted = {
      key: {
        remoteJid: m.chat,
        fromMe: normalize(ctx.participant) === normalize(conn.user?.id),
        id: ctx.stanzaId,
        participant: normalize(ctx.participant)
      },
      message: qm,
      mtype: qtype,
      sender: normalize(ctx.participant),
      text:
        qcontent.text ||
        qcontent.caption ||
        qcontent?.extendedTextMessage?.text ||
        '',
      download: async () => {
        const s = await downloadContentFromMessage(
          qcontent,
          normalizeType(qtype)
        )
        return streamToBuffer(s)
      }
    }
  }

  m.reply = (text, chat = m.chat, opts = {}) =>
    conn.sendMessage(chat, { text, ...opts }, { quoted: m })

  m.download = async () => {
    const s = await downloadContentFromMessage(
      content,
      normalizeType(mtype)
    )
    return streamToBuffer(s)
  }

  return m
}

export function createSocket(opts = {}) {
  const sock = _makeWASocket(opts)
  sock.smsg = m => smsg(sock, m)
  return sock
}