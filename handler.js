import { smsg, decodeJid, all } from './lib/simple.js'

Error.stackTraceLimit = 0

const OWNER = new Set(
  (global.owner || []).map(o =>
    decodeJid(Array.isArray(o) ? o[0] : o)
  )
)

const FAIL = {
  rowner: 'Solo el owner',
  owner: 'Solo el owner',
  admin: 'Solo admins',
  botAdmin: 'Necesito admin'
}

global.dfail = (t, m, c) =>
  FAIL[t] && c.sendMessage(m.chat, { text: FAIL[t] }, { quoted: m })

const GROUP_CACHE = new Map()
const TTL = 30_000

async function getGroupInfo(conn, jid) {
  const now = Date.now()
  const cached = GROUP_CACHE.get(jid)

  if (cached && now - cached.time < TTL) return cached

  const meta = await conn.groupMetadata(jid)
  const admins = new Set()
  let botAdmin = false
  const botJid = decodeJid(conn.user.id)

  for (const p of meta.participants || []) {
    const id = decodeJid(p.id || p.jid)
    if (p.admin) admins.add(id)
    if (id === botJid && p.admin) botAdmin = true
  }

  const data = {
    time: now,
    admins,
    botAdmin
  }

  GROUP_CACHE.set(jid, data)
  return data
}

export async function handler(update) {
  const msgs = update?.messages
  if (!msgs) return

  for (const raw of msgs) {
    if (!raw.message) continue
    if (raw.key?.remoteJid === 'status@broadcast') continue
    await process.call(this, raw)
  }
}

async function process(raw) {
  const m = await smsg(this, raw)
  if (!m || m.isBaileys) return

  all(m)

  if (!m.text) return

  const prefix = m.text[0]
  if (prefix !== '.' && prefix !== '!') return

  const body = m.text.slice(1).trim()
  if (!body) return

  const [cmd, ...args] = body.split(/\s+/)
  const command = cmd.toLowerCase()

  const plugin = global.COMMAND_MAP.get(command)
  if (!plugin || plugin.disabled) return

  const sender = decodeJid(m.sender)

  const isROwner = OWNER.has(sender)
  const isOwner = isROwner

  let isAdmin = false
  let isBotAdmin = false

  if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
    const info = await getGroupInfo(this, m.chat)
    isAdmin = info.admins.has(sender)
    isBotAdmin = info.botAdmin
  }

  if (plugin.rowner && !isROwner)
    return global.dfail('rowner', m, this)

  if (plugin.owner && !isOwner)
    return global.dfail('owner', m, this)

  if (plugin.admin && !isAdmin)
    return global.dfail('admin', m, this)

  if (plugin.botAdmin && !isBotAdmin)
    return global.dfail('botAdmin', m, this)

  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  await exec.call(this, m, {
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