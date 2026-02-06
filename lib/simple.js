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

const jidCache = new Map()

export function decodeJid(jid) {
  if (!jid) return jid
  let v = jidCache.get(jid)
  if (v) return v
  try {
    v = jidNormalizedUser(jid)
  } catch {
    v = jid
  }
  jidCache.set(jid, v)
  return v
}

const typeCache = Object.create(null)

function normalizeType(type = '') {
  let v = typeCache[type]
  if (v) return v

  v = type
    .replace('viewOnceMessageV2', '')
    .replace('viewOnceMessage', '')
    .replace('Message', '')

  typeCache[type] = v
  return v
}

async function streamToBuffer(stream) {
  if (!stream) return Buffer.alloc(0)
  if (Buffer.isBuffer(stream)) return stream

  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

export function smsg(conn, m) {
  if (!m || !m.message) return m

  const key = m.key
  const msg = m.message

  const mtype = getContentType(msg)
  const content = msg[mtype] || {}

  const userJid = conn.user?.id

  m.id = key?.id
  m.chat = decodeJid(key?.remoteJid)
  m.fromMe = !!key?.fromMe
  m.isGroup = m.chat?.endsWith('@g.us') || false

  m.sender = decodeJid(
    m.fromMe ? userJid : key?.participant || m.chat
  )

  m.isBaileys = key?.id?.startsWith('BAE5') || false
  m.isBot = m.fromMe

  m.mtype = mtype
  m.msg = content
  m.mediaType = normalizeType(mtype)

  m.text =
    content.text ??
    content.caption ??
    msg.conversation ??
    content?.extendedTextMessage?.text ??
    ''

  m.body = m.text
  m.pushName = m.pushName || m.notifyName || ''
  m.mentionedJid = content.contextInfo?.mentionedJid || []

  const ctx = content.contextInfo
  if (ctx?.quotedMessage) {
    const qm = ctx.quotedMessage
    const qtype = getContentType(qm)
    const qcontent = qm[qtype] || {}
    const quotedSender = decodeJid(ctx.participant)

    m.quoted = {
      key: {
        remoteJid: m.chat,
        fromMe: quotedSender === decodeJid(userJid),
        id: ctx.stanzaId,
        participant: quotedSender
      },
      message: qm,
      mtype: qtype,
      sender: quotedSender,
      text:
        qcontent.text ??
        qcontent.caption ??
        qcontent?.extendedTextMessage?.text ??
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

  sock.decodeJid = decodeJid
  sock.smsg = m => smsg(sock, m)

  return sock
}