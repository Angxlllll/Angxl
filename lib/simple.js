export default function smsg(conn, m) {
  if (!m) return m

  m.id = m.key.id
  m.chat = m.key.remoteJid
  m.fromMe = m.key.fromMe
  m.isGroup = m.chat.endsWith("@g.us")
  m.sender = m.fromMe
    ? conn.user.id
    : m.key.participant || m.chat

  m.pushName = m.pushName || "Sin nombre"

  m.message = m.message || {}
  m.mtype = Object.keys(m.message)[0]

  m.text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ""

  m.reply = (text, options = {}) =>
    conn.sendMessage(m.chat, { text, ...options }, { quoted: m })

  return m
}