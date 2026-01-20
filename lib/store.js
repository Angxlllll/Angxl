import { readFileSync, writeFile, existsSync } from 'fs'
import { setTimeout as delay } from 'timers/promises'

const { initAuthCreds, BufferJSON, proto } =
  (await import('@whiskeysockets/baileys')).default

const metadataCache = new Map()

function bind(conn) {
  if (conn.__storeBound) return
  conn.__storeBound = true

  if (!conn.chats) conn.chats = Object.create(null)

  const upsert = id => {
    return conn.chats[id] ||= { id }
  }

  const updateContacts = list => {
    list = list?.contacts || list
    if (!Array.isArray(list)) return

    for (const c of list) {
      const id = conn.decodeJid(c.id)
      if (!id || id === 'status@broadcast') continue

      const chat = upsert(id)

      if (id.endsWith('@g.us')) {
        chat.subject ||= c.subject || c.name || ''
      } else {
        chat.name ||= c.notify || c.name || ''
      }
    }
  }

  conn.ev.on('contacts.upsert', updateContacts)
  conn.ev.on('contacts.set', updateContacts)

  conn.ev.on('chats.set', async ({ chats }) => {
    for (let { id, name, readOnly } of chats || []) {
      id = conn.decodeJid(id)
      if (!id || id === 'status@broadcast') continue

      const chat = upsert(id)
      chat.isChats = !readOnly

      if (name) {
        if (id.endsWith('@g.us')) chat.subject = name
        else chat.name = name
      }

      if (id.endsWith('@g.us') && !metadataCache.has(id)) {
        const meta = await conn.groupMetadata(id).catch(() => null)
        if (meta) {
          metadataCache.set(id, meta)
          chat.subject = meta.subject
          chat.metadata = meta
        }
      }
    }
  })

  conn.ev.on('groups.update', async updates => {
    for (const u of updates || []) {
      const id = conn.decodeJid(u.id)
      if (!id || !id.endsWith('@g.us')) continue

      const chat = upsert(id)
      chat.isChats = true

      if (u.subject) chat.subject = u.subject

      if (!metadataCache.has(id)) {
        const meta = await conn.groupMetadata(id).catch(() => null)
        if (meta) {
          metadataCache.set(id, meta)
          chat.metadata = meta
        }
      }
    }
  })

  conn.ev.on('presence.update', ({ id, presences }) => {
    const sender = Object.keys(presences || {})[0] || id
    const jid = conn.decodeJid(sender)
    if (!jid) return

    upsert(jid).presences =
      presences[sender]?.lastKnownPresence || 'composing'
  })
}

const KEY_MAP = {
  'pre-key': 'preKeys',
  'session': 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory'
}

function useSingleFileAuthState(file, logger) {
  let creds
  let keys = Object.create(null)
  let dirty = false
  let saving = false

  if (existsSync(file)) {
    const data = JSON.parse(readFileSync(file), BufferJSON.reviver)
    creds = data.creds
    keys = data.keys || {}
  } else {
    creds = initAuthCreds()
  }

  const save = async force => {
    if (saving) return
    if (!dirty && !force) return

    saving = true
    dirty = false

    await delay(50)

    writeFile(
      file,
      JSON.stringify({ creds, keys }, BufferJSON.replacer),
      () => {
        saving = false
        logger?.trace?.('auth state saved')
      }
    )
  }

  setInterval(() => save(), 5000)

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const store = keys[KEY_MAP[type]] || {}
          return Object.fromEntries(
            ids.map(id => {
              let v = store[id]
              if (!v) return null
              if (type === 'app-state-sync-key')
                v = proto.AppStateSyncKeyData.fromObject(v)
              return [id, v]
            }).filter(Boolean)
          )
        },
        set: data => {
          for (const type in data) {
            const key = KEY_MAP[type]
            keys[key] ||= {}
            Object.assign(keys[key], data[type])
          }
          dirty = true
        }
      }
    },
    saveState: () => save(true)
  }
}

export default {
  bind,
  useSingleFileAuthState
}