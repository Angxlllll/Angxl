import * as baileys from '@whiskeysockets/baileys'

const {
  makeWASocket: _makeWASocket,
  getContentType,
  downloadContentFromMessage,
  jidNormalizedUser
} = baileys

export const delay = ms => new Promise(r => setTimeout(r, ms))

const DIGITS = s => String(s || '').replace(/\D/g, '')

const jidCache = new Map()
const JID_CACHE_LIMIT = 10000

export function decodeJid(jid) {
  if (!jid) return jid
  const cached = jidCache.get(jid)
  if (cached) return cached
  let v
  try {
    v = jidNormalizedUser(jid)
  } catch {
    v = jid
  }
  jidCache.set(jid, v)
  if (jidCache.size > JID_CACHE_LIMIT) {
    jidCache.delete(jidCache.keys().next().value)
  }
  return v
}

const typeCache = Object.create(null)

function normalizeType(type) {
  if (!type || typeof type !== 'string') return null
  let v = typeCache[type]
  if (v) return v
  v = type
    .replace('viewOnceMessageV2Extension', '')
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

  m.id = key.id
  m.chat = decodeJid(key.remoteJid)
  m.fromMe = !!key.fromMe
  m.isGroup = m.chat.endsWith('@g.us')

  m.sender = decodeJid(
    m.fromMe ? userJid : key.participant || m.chat
  )

  m.senderNum = DIGITS(m.sender)

  m.isBaileys =
    typeof key.id === 'string' &&
    key.id.length === 16 &&
    key.id.startsWith('BAE5')

  m.isBot = m.fromMe
  m.mtype = mtype
  m.msg = content

  const text =
    content.text ??
    content.caption ??
    msg.conversation ??
    content?.extendedTextMessage?.text ??
    ''

  m.text = text
  m.body = text

  const normType =
    mtype !== 'conversation' ? normalizeType(mtype) : null

  if (normType) m.mediaType = normType

  const ctx = content.contextInfo

  if (ctx?.mentionedJid) {
    m.mentionedJid = ctx.mentionedJid
  }

  if (ctx?.quotedMessage) {
    const qm = ctx.quotedMessage
    const qtype = getContentType(qm)
    const qcontent = qm[qtype] || {}
    const quotedSender = decodeJid(ctx.participant)
    const qNormType =
      qtype !== 'conversation' ? normalizeType(qtype) : null

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
      download: qNormType
        ? async () =>
            streamToBuffer(
              await downloadContentFromMessage(
                qcontent,
                qNormType
              )
            )
        : null
    }
  }

  m.reply = (text, chat = m.chat, opts = {}) =>
    conn.sendMessage(chat, { text, ...opts }, { quoted: m })

  if (normType) {
    m.download = async () =>
      streamToBuffer(
        await downloadContentFromMessage(
          content,
          normType
        )
      )
  }

  return m
}

export function createSocket(opts = {}) {
  const sock = _makeWASocket(opts)
  sock.decodeJid = decodeJid
  sock.smsg = m => smsg(sock, m)
  return sock
}

export function all(m) {
  const type = m.mtype
  if (type !== 'buttonsResponseMessage' && type !== 'listResponseMessage')
    return

  let selection

  if (type === 'buttonsResponseMessage') {
    selection = m.message?.buttonsResponseMessage?.selectedButtonId
  } else {
    selection =
      m.message?.listResponseMessage?.singleSelectReply?.selectedRowId
  }

  if (!selection) return

  m.text = selection
  m.body = selection

  const msg = m.message

  if (!msg.conversation) {
    msg.conversation = selection
  }

  const ext =
    msg.extendedTextMessage ||
    (msg.extendedTextMessage = {})

  ext.text = selection

  if (msg.buttonsResponseMessage)
    delete msg.buttonsResponseMessage

  if (msg.listResponseMessage)
    delete msg.listResponseMessage
}