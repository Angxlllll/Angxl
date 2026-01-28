import {
  makeWASocket as _makeWASocket,
  jidDecode,
  getContentType,
  downloadContentFromMessage
} from "@whiskeysockets/baileys"

export const delay = ms => new Promise(r => setTimeout(r, ms))

export function decodeJid(jid = "") {
  if (!jid) return jid
  if (jid.includes(":")) {
    const d = jidDecode(jid)
    if (d?.user && d?.server) return `${d.user}@${d.server}`
  }
  return jid
}

const streamToBuffer = async stream => {
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

export function smsg(conn, m) {
  if (!m?.message) return m

  const key = m.key
  const msg = m.message
  const mtype = getContentType(msg)
  const content = msg[mtype] || {}

  m.id = key.id
  m.chat = decodeJid(key.remoteJid)
  m.fromMe = key.fromMe
  m.isGroup = m.chat.endsWith("@g.us")
  m.sender = decodeJid(
    m.fromMe ? conn.user.id : key.participant || m.chat
  )

  m.text =
    msg.conversation ||
    content.text ||
    content.caption ||
    content?.extendedTextMessage?.text ||
    ""

  const ctx = content.contextInfo
  if (ctx?.quotedMessage) {
    const qm = ctx.quotedMessage
    const qt = getContentType(qm)
    const qc = qm[qt] || {}

    m.quoted = {
      sender: decodeJid(ctx.participant),
      text:
        qc.text ||
        qc.caption ||
        qc?.extendedTextMessage?.text ||
        "",
      download: async () => {
        const s = await downloadContentFromMessage(
          qc,
          qt.replace(/Message|viewOnceMessageV2?/g, "")
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
      mtype.replace(/Message|viewOnceMessageV2?/g, "")
    )
    return streamToBuffer(s)
  }

  return m
}

export function makeWASocket(opts = {}) {
  const sock = _makeWASocket(opts)
  sock.decodeJid = decodeJid
  sock.smsg = m => smsg(sock, m)
  return sock
}