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

const ADMIN_CACHE = new Map()
const ADMIN_TTL = 5 * 60 * 1000

export function handler(update) {
  const msgs = update?.messages
  if (!msgs) return

  for (const raw of msgs) {
    if (!raw.message) continue
    if (raw.key?.remoteJid === 'status@broadcast') continue
    handle.call(this, raw)
  }
}

async function handle(raw) {
  const m = smsg(this, raw)
  if (!m || m.isBaileys) return

  all(m)

  if (!m.text) return

  const c = m.text.charCodeAt(0)
  const hasPrefix = c === 46 || c === 33
  if (!hasPrefix && !global.sinprefix) return

  const body = hasPrefix ? m.text.slice(1) : m.text
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
    let cached = ADMIN_CACHE.get(m.chat)

    if (!cached || Date.now() - cached.t > ADMIN_TTL) {
      const meta = await this.groupMetadata(m.chat)
      const admins = new Set(
        meta.participants
          .filter(p => p.admin)
          .map(p => decodeJid(p.id))
      )
      cached = { admins, t: Date.now() }
      ADMIN_CACHE.set(m.chat, cached)
    }

    isAdmin = isOwner || cached.admins.has(sender)
    isBotAdmin = isOwner || cached.admins.has(botJid)

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
    usedPrefix: hasPrefix ? m.text[0] : '',
    isROwner,
    isOwner,
    isAdmin,
    isBotAdmin,
    chat: m.chat
  }

  try {
    await exec.call(this, m, ctx)
  } catch {}
}