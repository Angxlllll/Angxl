import * as baileys from '@whiskeysockets/baileys'

const {
  makeWASocket,
  getContentType,
  jidDecode,
  downloadContentFromMessage
} = baileys

if (typeof makeWASocket !== 'function') {
  throw new Error(
    '[simple.js] makeWASocket no es función. Fork AngelBotsD/Baileys detectado con export distinto.'
  )
}

const delay = ms => new Promise(res => setTimeout(res, ms))

const decodeCache = new Map()

function decodeJid(jid = '') {
  if (!jid) return jid
  if (decodeCache.has(jid)) return decodeCache.get(jid)

  let res = jid
  if (jid.includes(':') && jid.includes('@')) {
    const d = jidDecode(jid)
    if (d?.user && d?.server) res = d.user + '@' + d.server
  }

  decodeCache.set(jid, res)
  return res
}

function smsg(conn, m) {
  if (!m) return m

  const key = m.key
  if (key) {
    m.id = key.id
    m.chat = decodeJid(key.remoteJid)
    m.fromMe = key.fromMe
    m.isGroup = m.chat?.endsWith('@g.us')
    m.sender = decodeJid(
      m.fromMe ? conn.user?.id : key.participant || m.chat
    )
  }

  const msg = m.message
  if (!msg) return m

  const mtype = getContentType(msg)
  m.mtype = mtype
  const content = msg[mtype]
  m.msg = content

  const text =
    msg.conversation ||
    content?.text ||
    content?.caption ||
    ''

  m.text = text
  m.body = text
  m.mentionedJid = content?.contextInfo?.mentionedJid || []

  const ctx = content?.contextInfo
  if (ctx?.quotedMessage) {
    const qm = ctx.quotedMessage
    const qtype = getContentType(qm)
    const qcontent = qm[qtype]

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
      text: qcontent?.text || qcontent?.caption || ''
    }

    m.quoted.download = async () => {
      const stream = await downloadContentFromMessage(
        qcontent,
        qtype.replace('Message', '')
      )
      let buffer = Buffer.alloc(0)
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }
      return buffer
    }
  }

  m.reply = (text, chat = m.chat, options = {}) =>
    conn.sendMessage(chat, { text, ...options }, { quoted: m })

  m.download = () =>
    downloadContentFromMessage(
      content,
      mtype.replace('Message', '')
    )

  return m
}

function makeWASocketConn(opts = {}) {
  const sock = makeWASocket(opts)

  sock.decodeJid = decodeJid
  sock.normalizeJid = decodeJid

  const INFO = '\x1b[96m[INFO]\x1b[0m'
  const WARN = '\x1b[93m[WARN]\x1b[0m'
  const ERROR = '\x1b[91m[ERROR]\x1b[0m'

  sock.logger = {
    info: (...a) => console.log(INFO, ...a),
    warn: (...a) => console.log(WARN, ...a),
    error: (...a) => console.log(ERROR, ...a)
  }

  sock.smsg = m => smsg(sock, m)

  return sock
}

export {
  makeWASocketConn as makeWASocket,
  smsg,
  delay,
  decodeJid
}