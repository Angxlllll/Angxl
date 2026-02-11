import baileys from "@whiskeysockets/baileys"
const { decodeJid } = baileys

Error.stackTraceLimit = 0

const DIGITS = s => String(s || "").replace(/\D/g, "")

function lidParser(participants = []) {
  try {
    return participants.map(v => ({
      id: (typeof v?.id === "string" && v.id.endsWith("@lid") && v.jid) ? v.jid : v.id,
      admin: v?.admin ?? null,
      raw: v
    }))
  } catch {
    return participants || []
  }
}

async function isAdminByNumber(conn, chatId, number) {
  try {
    const meta = await conn.groupMetadata(chatId)
    const raw = Array.isArray(meta?.participants) ? meta.participants : []
    const norm = lidParser(raw)

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i]
      const n = norm[i]
      const isAdm =
        r?.admin === "admin" ||
        r?.admin === "superadmin" ||
        n?.admin === "admin" ||
        n?.admin === "superadmin"

      if (!isAdm) continue

      const ids = [r?.id, r?.jid, n?.id]
      if (ids.some(x => DIGITS(x) === number)) return true
    }
    return false
  } catch {
    return false
  }
}

async function isBotAdminReal(conn, chatId) {
  try {
    const meta = await conn.groupMetadata(chatId)
    const raw = Array.isArray(meta?.participants) ? meta.participants : []
    const norm = lidParser(raw)
    const botJid = decodeJid(conn.user?.id || "")
    const idx = norm.findIndex(p => p?.id === botJid)
    if (idx < 0) return false

    const r = raw[idx]
    const n = norm[idx]
    return (
      r?.admin === "admin" ||
      r?.admin === "superadmin" ||
      n?.admin === "admin" ||
      n?.admin === "superadmin"
    )
  } catch {
    return false
  }
}

const FAIL = {
  rowner: "Solo el owner",
  owner: "Solo el owner",
  admin: "Solo admins",
  botAdmin: "Necesito admin"
}

global.dfail = (t, m, c) =>
  FAIL[t] && c.sendMessage(m.chat, { text: FAIL[t] }, { quoted: m })

export async function handler(update) {
  const msgs = update?.messages
  if (!msgs) return

  for (const raw of msgs) {
    if (!raw.message) continue
    if (raw.key?.remoteJid === "status@broadcast") continue
    await process.call(this, raw)
  }
}

async function process(raw) {
  const msg = raw.message
  const key = raw.key
  const chatId = key.remoteJid
  const fromMe = !!key.fromMe

  if (!msg) return

  const type = Object.keys(msg)[0]
  const content = msg[type]

  let text = ""
  if (type === "conversation") text = content
  else if (type === "extendedTextMessage") text = content.text
  else if (type === "imageMessage" || type === "videoMessage") text = content.caption || ""

  if (!text) return

  const prefix = text[0]
  if (prefix !== "." && prefix !== "!") return

  const body = text.slice(1).trim()
  if (!body) return

  const [cmd, ...args] = body.split(/\s+/)
  const command = cmd.toLowerCase()

  const plugin = global.COMMAND_MAP.get(command)
  if (!plugin || plugin.disabled) return

  const senderJid = key.participant || chatId
  const senderNo = DIGITS(senderJid)

  const owners = global.owner || []
  const isROwner =
    Array.isArray(owners) &&
    owners.some(o => DIGITS(Array.isArray(o) ? o[0] : o) === senderNo)

  const isOwner = isROwner
  const isGroup = chatId.endsWith("@g.us")

  let isAdmin = false
  let isBotAdmin = false

  if (isGroup) {
    isAdmin = isOwner || await isAdminByNumber(this, chatId, senderNo)
    isBotAdmin = isOwner || await isBotAdminReal(this, chatId)
  }

  if (plugin.rowner && !isROwner)
    return global.dfail("rowner", { chat: chatId }, this)

  if (plugin.owner && !isOwner)
    return global.dfail("owner", { chat: chatId }, this)

  if (plugin.admin && !isAdmin && !fromMe)
    return global.dfail("admin", { chat: chatId }, this)

  if (plugin.botAdmin && !isBotAdmin)
    return global.dfail("botAdmin", { chat: chatId }, this)

  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  await exec.call(this, {
    key,
    chat: chatId,
    sender: senderJid,
    text,
    message: msg
  }, {
    conn: this,
    args,
    command,
    usedPrefix: prefix,
    isROwner,
    isOwner,
    isAdmin,
    isBotAdmin
  })
}