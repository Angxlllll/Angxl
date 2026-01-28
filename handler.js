import smsg from "./lib/simple.js"

const DIGITS = s => String(s || "").replace(/\D/g, "")

const OWNER_NUMBERS = (global.owner || []).map(v =>
  DIGITS(Array.isArray(v) ? v[0] : v)
)

global.groupMetaCache ||= new Map()

export function handler(chatUpdate) {
  if (!chatUpdate?.messages) return
  for (const m of chatUpdate.messages)
    handleMessage.call(this, m)
}

async function handleMessage(raw) {
  let m = smsg(this, raw)
  if (!m || m.isBaileys || !m.text) return

  const text = m.text
  const prefixes = Array.isArray(global.prefixes)
    ? global.prefixes
    : [global.prefix || "."]

  let usedPrefix = ""
  let command = ""
  let args = []

  if (prefixes.includes(text[0])) {
    usedPrefix = text[0]
    const body = text.slice(1).trim()
    if (!body) return
    args = body.split(/\s+/)
    command = args.shift().toLowerCase()
  }

  const senderNum = DIGITS(m.sender)
  const isROwner = OWNER_NUMBERS.includes(senderNum)
  const isOwner = isROwner || m.fromMe

  let meta, isAdmin = false, isBotAdmin = !m.isGroup

  if (m.isGroup) {
    const cached = global.groupMetaCache.get(m.chat)
    if (!cached || Date.now() - cached.ts > 15000) {
      meta = await this.groupMetadata(m.chat)
      const admins = new Set(
        meta.participants
          .filter(p => p.admin)
          .flatMap(p => [p.id, p.jid])
          .map(DIGITS)
          .filter(Boolean)
      )
      global.groupMetaCache.set(m.chat, {
        ts: Date.now(),
        meta,
        admins
      })
    }

    const data = global.groupMetaCache.get(m.chat)
    meta = data.meta
    isAdmin = data.admins.has(senderNum)

    isBotAdmin = data.admins.has(DIGITS(this.user.id))
  }

  for (const plugin of Object.values(global.plugins)) {
    if (!plugin || plugin.disabled) continue

    const match =
      plugin.customPrefix instanceof RegExp
        ? plugin.customPrefix.test(text)
        : plugin.command instanceof RegExp
        ? plugin.command.test(command)
        : Array.isArray(plugin.command)
        ? plugin.command.includes(command)
        : plugin.command === command

    if (!match) continue

    if (plugin.group && !m.isGroup)
      return m.reply("❌ Solo funciona en grupos")

    if (plugin.rowner && !isROwner)
      return m.reply("❌ Solo el owner")

    if (plugin.owner && !isOwner)
      return m.reply("❌ Solo owner")

    if (plugin.admin && !isAdmin)
      return m.reply("❌ Solo admins")

    if (plugin.botAdmin && !isBotAdmin)
      return m.reply("❌ Necesito ser admin")

    const exec = plugin.default || plugin
    if (typeof exec !== "function") return

    return exec.call(this, m, {
      conn: this,
      args,
      usedPrefix,
      command,
      groupMetadata: meta,
      isOwner,
      isAdmin,
      isBotAdmin
    })
  }
}