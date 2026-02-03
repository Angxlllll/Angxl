import * as baileys from '@whiskeysockets/baileys'

const {
  makeWASocket: _makeWASocket,
  getContentType,
  jidDecode,
  downloadContentFromMessage
} = baileys

if (typeof _makeWASocket !== 'function') {
  throw new Error('[simple.js] Fork de Baileys incompatible')
}

export const delay = ms => new Promise(r => setTimeout(r, ms))

const decodeCache = new Map()
const MAX_CACHE = 1000

export function decodeJid(jid = '') {
  if (!jid) return jid
  if (decodeCache.has(jid)) return decodeCache.get(jid)

  let res = jid
  if (jid.includes(':') && jid.includes('@')) {
    const d = jidDecode(jid)
    if (d?.user && d?.server) res = `${d.user}@${d.server}`
  }

  decodeCache.set(jid, res)
  if (decodeCache.size > MAX_CACHE) {
    decodeCache.delete(decodeCache.keys().next().value)
  }

  return res
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
  m.chat = decodeJid(key?.remoteJid)
  m.fromMe = key?.fromMe
  m.isGroup = m.chat?.endsWith('@g.us')
  m.sender = decodeJid(
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
        fromMe: decodeJid(ctx.participant) === decodeJid(conn.user?.id),
        id: ctx.stanzaId,
        participant: decodeJid(ctx.participant)
      },
      message: qm,
      mtype: qtype,
      sender: decodeJid(ctx.participant),
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

  sock.decodeJid = decodeJid
  sock.normalizeJid = decodeJid
  sock.smsg = m => smsg(sock, m)

  return sock
}