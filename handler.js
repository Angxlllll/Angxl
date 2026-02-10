import { smsg, decodeJid, all } from './lib/simple.js'

Error.stackTraceLimit = 0

const OWNER = new Set(
  (global.owner || []).map(o =>
    decodeJid(Array.isArray(o) ? o[0] : o)
  )
)

const FAIL = {
  rowner: 'Este comando es solo para el owner',
  owner: 'Este comando es solo para el owner',
  admin: 'Este comando es solo para admins',
  botAdmin: 'Necesito ser admin'
}

global.dfail = (t, m, c) =>
  FAIL[t] && c.sendMessage(m.chat, { text: FAIL[t] }, { quoted: m })

function getGroupAdmins(jid) {
  const meta = global.groupMetadata.get(jid)
  if (!meta) return null
  return new Set(
    meta.participants
      .filter(p => p.admin)
      .map(p => decodeJid(p.id))
  )
}

export function handler(update) {
  const msgs = update?.messages
  if (!msgs) return

  for (const raw of msgs) {
    if (!raw.message) continue
    if (raw.key?.remoteJid === 'status@broadcast') continue
    process.call(this, raw)
  }
}

async function process(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys) return

  all(m)

  const text = m.text
  if (!text) return

  const prefix = text[0]
  if (prefix !== '.' && prefix !== '!') return

  const body = text.slice(1).trim()
  if (!body) return

  const space = body.indexOf(' ')
  const command = (space === -1 ? body : body.slice(0, space)).toLowerCase()

  const plugin = global.COMMAND_MAP.get(command)
  if (!plugin || plugin.disabled) return

  const args = space === -1 ? [] : body.slice(space + 1).split(/\s+/)

  const sender = decodeJid(m.sender)
  const botJid = decodeJid(this.user.id)

  const isROwner = OWNER.has(sender)
  const isOwner = isROwner

  let isAdmin = false
  let isBotAdmin = false

  if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
    const admins = getGroupAdmins(m.chat)
    if (!admins) return

    isAdmin = isOwner || admins.has(sender)
    isBotAdmin = isOwner || admins.has(botJid)

    if (plugin.admin && !isAdmin)
      return global.dfail('admin', m, this)

    if (plugin.botAdmin && !isBotAdmin)
      return global.dfail('botAdmin', m, this)
  }

  if (plugin.rowner && !isROwner)
    return global.dfail('rowner', m, this)

  if (plugin.owner && !isOwner)
    return global.dfail('owner', m, this)

  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  exec.call(this, m, {
    conn: this,
    args,
    command,
    usedPrefix: prefix,
    isROwner,
    isOwner,
    isAdmin,
    isBotAdmin,
    chat: m.chat
  })
}