import { smsg, decodeJid, all } from './lib/simple.js'

Error.stackTraceLimit = 0

const OWNER = new Set(
  (global.owner || []).map(o =>
    decodeJid(Array.isArray(o) ? o[0] : o)
  )
)

const FAIL = {
  rowner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝗈 𝖱𝖾𝗌𝗍𝗋𝗂𝗇𝗀𝗂𝖽𝗈',
  owner: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗍𝗂𝗅𝗂𝗓𝖺𝖽𝗈 𝖯𝗈𝗋 𝖬𝗂 𝖢𝗋𝖾𝖺𝖽𝗈𝗋',
  admin: '𝖤𝗌𝗍𝖾 𝖢𝗈𝗆𝖺𝗇𝖽𝗈 𝖲𝗈𝗅𝗈 𝖯𝗎𝖾𝖽𝖾 𝖲𝖾𝗋 𝖴𝗌𝗈 𝖣𝖾 𝖠𝖽𝗆𝗂𝗇',
  botAdmin: '𝖭𝖾𝖼𝖾𝗌𝗂𝗍𝗈 𝖲𝖾𝗋 𝖠𝖽𝗆𝗂𝗇'
}

global.dfail = (t, m, c) =>
  FAIL[t] && c.sendMessage(m.chat, { text: FAIL[t] }, { quoted: m })

global.groupAdmins ||= new Map()
const ADMIN_TTL = 20000

export function bindGroupEvents(conn) {
  conn.ev.on('group-participants.update', e => {
    const cached = global.groupAdmins.get(e.id)
    if (!cached) return
    for (const jid of e.participants) {
      const j = decodeJid(jid)
      if (e.action === 'promote') cached.admins.add(j)
      else if (e.action === 'demote') cached.admins.delete(j)
    }
    if (e.action === 'promote' || e.action === 'demote') {
      cached.t = Date.now()
    }
  })
}

export function handler(update) {
  const msgs = update?.messages
  if (!msgs) return
  for (const raw of msgs) {
    handle.call(this, raw)
  }
}

async function handle(raw) {
  const m = smsg(this, raw)
if (!m || m.isBaileys) return

await all(m)

if (!m.text) return

  all(m).catch(() => {})

  const text = m.text
  const c = text.charCodeAt(0)
  const hasPrefix = c === 46 || c === 33

  if (!global.sinprefix && !hasPrefix) return

  const body = hasPrefix ? text.slice(1) : text
  const space = body.indexOf(' ')
  if (space === 0) return

  const command =
    (space === -1 ? body : body.slice(0, space)).toLowerCase()

  if (!command) return

  const plugin = global.COMMAND_MAP?.get(command)
  if (!plugin || plugin.disabled) return

  const args =
    space === -1 ? [] : body.slice(space + 1).trim().split(/\s+/)

  const sender = m.sender
  const botJid = decodeJid(this.user.id)

  const isROwner = OWNER.has(sender)
  const isOwner = isROwner

  if ((command === 'on' || command === 'off') && args[0] === 'sinprefix') {
    if (!isOwner) return global.dfail('owner', m, this)
    const enable = command === 'on'
    if (global.sinprefix !== enable) {
      global.sinprefix = enable
      return this.sendMessage(
        m.chat,
        { text: `sinprefix ${enable ? 'activado' : 'desactivado'}` },
        { quoted: m }
      )
    }
    return
  }

  if (plugin.rowner && !isROwner)
    return global.dfail('rowner', m, this)

  if (plugin.owner && !isOwner)
    return global.dfail('owner', m, this)

  let isAdmin = false
  let isBotAdmin = false
  let participants
  let groupMetadata

  if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
    let cached = global.groupAdmins.get(m.chat)
    let admins

    if (!cached || Date.now() - cached.t > ADMIN_TTL) {
      groupMetadata = await this.groupMetadata(m.chat)
      participants = groupMetadata.participants
      admins = new Set(
        participants.filter(p => p.admin).map(p => decodeJid(p.id))
      )
      global.groupAdmins.set(m.chat, { admins, t: Date.now() })
    } else {
      admins = cached.admins
    }

    isAdmin = isOwner || admins.has(sender)
    isBotAdmin = isOwner || admins.has(botJid)

    if (plugin.admin && !isAdmin)
      return global.dfail('admin', m, this)

    if (plugin.botAdmin && !isBotAdmin)
      return global.dfail('botAdmin', m, this)
  }

  const exec = plugin.exec || plugin.default || plugin
  if (!exec) return

  const ctx = {
    conn: this,
    args,
    command,
    usedPrefix: hasPrefix ? text[0] : '',
    isROwner,
    isOwner,
    isAdmin,
    isBotAdmin,
    chat: m.chat
  }

  if (participants) ctx.participants = participants
  if (groupMetadata) ctx.groupMetadata = groupMetadata

  exec.call(this, m, ctx).catch(() => {})
}