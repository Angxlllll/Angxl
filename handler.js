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

  const c = text.charCodeAt(0)
  const hasPrefix = c === 46 || c === 33
  if (!hasPrefix && !global.sinprefix) return

  const body = hasPrefix ? text.slice(1) : text
  if (!body) return

  const space = body.indexOf(' ')
  const command = (space === -1 ? body : body.slice(0, space)).toLowerCase()

  const plugin = global.COMMAND_MAP?.get(command)
  if (!plugin || plugin.disabled) return

  const args = space === -1 ? [] : body.slice(space + 1).trim().split(/\s+/)

  const sender = decodeJid(m.sender)

  if (!this.user.jidDecoded)
    this.user.jidDecoded = decodeJid(this.user.id)

  const botJid = this.user.jidDecoded

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

  try {
    exec.call(this, m, ctx)
  } catch {}
}