import { readFileSync, writeFile, existsSync } from 'fs'
import { setTimeout as delay } from 'timers/promises'
import {
  initAuthCreds,
  BufferJSON,
  proto,
  jidNormalizedUser
} from '@whiskeysockets/baileys'

const jidCache = new Map()
function normalize(jid) {
  if (!jid) return null
  let v = jidCache.get(jid)
  if (v) return v
  try {
    v = jidNormalizedUser(jid)
  } catch {
    v = null
  }
  if (v) jidCache.set(jid, v)
  return v
}

const metadataCache = new Map()
const META_TTL = 60_000

function getCachedMeta(id) {
  const c = metadataCache.get(id)
  if (!c) return null
  if (Date.now() - c.ts > META_TTL) {
    metadataCache.delete(id)
    return null
  }
  return c.data
}

function setCachedMeta(id, data) {
  metadataCache.set(id, { ts: Date.now(), data })
}

setInterval(() => {
  const now = Date.now()
  for (const [id, v] of metadataCache) {
    if (now - v.ts > META_TTL) metadataCache.delete(id)
  }
}, META_TTL)

function bind(conn) {
  if (conn.__storeBound) return
  conn.__storeBound = true

  conn.chats ||= Object.create(null)

  const upsert = id => (conn.chats[id] ||= { id })

  const updateContacts = list => {
    list = list?.contacts || list
    if (!Array.isArray(list)) return

    for (const c of list) {
      const id = normalize(c.id)
      if (!id || id === 'status@broadcast') continue

      const chat = upsert(id)

      if (id.endsWith('@g.us')) {
        chat.subject ??= c.subject || c.name || ''
      } else {
        chat.name ??= c.notify || c.name || ''
      }
    }
  }

  conn.ev.on('contacts.upsert', updateContacts)
  conn.ev.on('contacts.set', updateContacts)

  conn.ev.on('chats.set', ({ chats }) => {
    for (let { id, name, readOnly } of chats || []) {
      id = normalize(id)
      if (!id || id === 'status@broadcast') continue

      const chat = upsert(id)
      chat.isChats = !readOnly

      if (name) {
        if (id.endsWith('@g.us')) chat.subject = name
        else chat.name = name
      }
    }
  })

  conn.ev.on('groups.update', updates => {
    for (const u of updates || []) {
      const id = normalize(u.id)
      if (!id || !id.endsWith('@g.us')) continue

      const chat = upsert(id)
      chat.isChats = true

      if (u.subject) chat.subject = u.subject
    }
  })

  conn.ev.on('presence.update', ({ id, presences }) => {
    const sender = Object.keys(presences || {})[0] || id
    const jid = normalize(sender)
    if (!jid) return

    upsert(jid).presence =
      presences[sender]?.lastKnownPresence || 'available'
  })

  conn.getGroupMetadataCached = async jid => {
    jid = normalize(jid)
    if (!jid?.endsWith('@g.us')) return null

    const cached = getCachedMeta(jid)
    if (cached) return cached

    const meta = await conn.groupMetadata(jid).catch(() => null)
    if (meta) setCachedMeta(jid, meta)
    return meta
  }
}

const KEY_MAP = {
  'pre-key': 'preKeys',
  session: 'sessions',
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
  let saveTimer = null

  if (existsSync(file)) {
    const data = JSON.parse(readFileSync(file), BufferJSON.reviver)
    creds = data.creds
    keys = data.keys || {}
  } else {
    creds = initAuthCreds()
  }

  const scheduleSave = (force = false) => {
    dirty = true
    if (saving) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => save(force), 200)
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

  setInterval(() => save(false), 10_000)

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const store = keys[KEY_MAP[type]] || {}
          return Object.fromEntries(
            ids
              .map(id => {
                let v = store[id]
                if (!v) return null
                if (type === 'app-state-sync-key')
                  v = proto.AppStateSyncKeyData.fromObject(v)
                return [id, v]
              })
              .filter(Boolean)
          )
        },
        set: data => {
          for (const type in data) {
            const key = KEY_MAP[type]
            keys[key] ||= {}
            Object.assign(keys[key], data[type])
          }
          scheduleSave()
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