import { readFileSync, writeFileSync, existsSync } from 'fs'

const { initAuthCreds, BufferJSON, proto } = (await import('@whiskeysockets/baileys')).default

function bind(conn) {
    if (!conn.chats) conn.chats = {}

    const upsertChat = (id) => {
        if (!conn.chats[id]) conn.chats[id] = { id }
        return conn.chats[id]
    }

    const updateNameToDb = (contacts) => {
        if (!contacts) return
        contacts = contacts.contacts || contacts

        for (const contact of contacts) {
            const id = conn.decodeJid(contact.id)
            if (!id || id === 'status@broadcast') continue

            const chat = upsertChat(id)

            if (id.endsWith('@g.us')) {
                chat.subject = contact.subject || contact.name || chat.subject || ''
            } else {
                chat.name = contact.notify || contact.name || chat.name || ''
            }
        }
    }

    conn.ev.on('contacts.upsert', updateNameToDb)
    conn.ev.on('contacts.set', updateNameToDb)

    conn.ev.on('chats.set', async ({ chats }) => {
        for (let { id, name, readOnly } of chats) {
            id = conn.decodeJid(id)
            if (!id || id === 'status@broadcast') continue

            const chat = upsertChat(id)
            chat.isChats = !readOnly

            if (name) {
                if (id.endsWith('@g.us')) chat.subject = name
                else chat.name = name
            }

            if (id.endsWith('@g.us') && !chat.metadata) {
                const metadata = await conn.groupMetadata(id).catch(() => null)
                if (metadata) {
                    chat.subject = metadata.subject
                    chat.metadata = metadata
                }
            }
        }
    })

    conn.ev.on('group-participants.update', async ({ id }) => {
        id = conn.decodeJid(id)
        if (!id || id === 'status@broadcast') return

        const chat = upsertChat(id)
        chat.isChats = true

        if (!chat.metadata) {
            const metadata = await conn.groupMetadata(id).catch(() => null)
            if (metadata) {
                chat.subject = metadata.subject
                chat.metadata = metadata
            }
        }
    })

    conn.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            const id = conn.decodeJid(update.id)
            if (!id || !id.endsWith('@g.us')) continue

            const chat = upsertChat(id)
            chat.isChats = true

            if (update.subject) chat.subject = update.subject

            if (!chat.metadata) {
                const metadata = await conn.groupMetadata(id).catch(() => null)
                if (metadata) chat.metadata = metadata
            }
        }
    })

    conn.ev.on('chats.upsert', ({ id, name }) => {
        if (!id || id === 'status@broadcast') return
        const chat = upsertChat(id)
        chat.isChats = true
        if (name) chat.name = name
    })

    conn.ev.on('presence.update', ({ id, presences }) => {
        const sender = Object.keys(presences)[0] || id
        const jid = conn.decodeJid(sender)
        if (!jid) return

        const chat = upsertChat(jid)
        chat.presences = presences[sender]?.lastKnownPresence || 'composing'
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

function useSingleFileAuthState(filename, logger) {
    let creds
    let keys = {}
    let lastSave = Date.now()
    let pending = false

    const saveState = (force) => {
        const now = Date.now()
        if (!force && now - lastSave < 3000) {
            pending = true
            return
        }

        writeFileSync(
            filename,
            JSON.stringify({ creds, keys }, BufferJSON.replacer, 2)
        )

        lastSave = now
        pending = false
        logger?.trace('auth state saved')
    }

    if (existsSync(filename)) {
        const data = JSON.parse(readFileSync(filename), BufferJSON.reviver)
        creds = data.creds
        keys = data.keys
    } else {
        creds = initAuthCreds()
        keys = {}
    }

    setInterval(() => {
        if (pending) saveState(true)
    }, 5000)

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const key = KEY_MAP[type]
                    const store = keys[key] || {}
                    return Object.fromEntries(
                        ids
                            .map(id => {
                                let value = store[id]
                                if (!value) return null
                                if (type === 'app-state-sync-key') {
                                    value = proto.AppStateSyncKeyData.fromObject(value)
                                }
                                return [id, value]
                            })
                            .filter(Boolean)
                    )
                },
                set: (data) => {
                    for (const type in data) {
                        const key = KEY_MAP[type]
                        keys[key] = keys[key] || {}
                        Object.assign(keys[key], data[type])
                    }
                    saveState()
                }
            }
        },
        saveState
    }
}

export default {
    bind,
    useSingleFileAuthState
}