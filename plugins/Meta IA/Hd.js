import fetch from 'node-fetch'
import FormData from 'form-data'
import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

function unwrapMessage(m) {
  let n = m
  while (
    n?.viewOnceMessage?.message ||
    n?.viewOnceMessageV2?.message ||
    n?.viewOnceMessageV2Extension?.message ||
    n?.ephemeralMessage?.message
  ) {
    n =
      n.viewOnceMessage?.message ||
      n.viewOnceMessageV2?.message ||
      n.viewOnceMessageV2Extension?.message ||
      n.ephemeralMessage?.message
  }
  return n
}

async function streamToBuffer(stream) {
  let buf = Buffer.alloc(0)
  for await (const c of stream) buf = Buffer.concat([buf, c])
  return buf
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const chat = m.key.remoteJid
  const prefix = usedPrefix || '.'

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    ''

  if (!text.startsWith(prefix + command)) return

  await conn.sendMessage(chat, {
    react: { text: '🕒', key: m.key }
  })

  const root = unwrapMessage(m.message)
  const ctx = root?.extendedTextMessage?.contextInfo
  const quoted = ctx?.quotedMessage
    ? unwrapMessage(ctx.quotedMessage)
    : null

  const imageMsg =
    quoted?.imageMessage ||
    root?.imageMessage

  if (!imageMsg) {
    return conn.sendMessage(
      chat,
      {
        text: `Envía o responde a una imagen con:\n${prefix + command}`
      },
      { quoted: m }
    )
  }

  try {
    const stream = await downloadContentFromMessage(imageMsg, 'image')
    const media = await streamToBuffer(stream)

    const mime = imageMsg.mimetype || 'image/jpeg'
    const ext = mime.split('/')[1] || 'jpg'

    const form = new FormData()
    form.append('image', media, {
      filename: `image.${ext}`,
      contentType: mime
    })
    form.append('scale', '2')

    const res = await fetch(
      'https://api2.pixelcut.app/image/upscale/v1',
      {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          accept: 'application/json'
        },
        body: form
      }
    )

    const json = await res.json()
    if (!json?.result_url) {
      throw new Error('Respuesta inválida de Pixelcut')
    }

    const result = await fetch(json.result_url)
    const buffer = Buffer.from(await result.arrayBuffer())

    await conn.sendMessage(
      chat,
      { image: buffer },
      { quoted: m }
    )

    await conn.sendMessage(chat, {
      react: { text: '✅', key: m.key }
    })

  } catch (e) {
    await conn.sendMessage(chat, {
      react: { text: '❌', key: m.key }
    })

    await conn.sendMessage(
      chat,
      { text: `Falló la mejora:\n${e.message}` },
      { quoted: m }
    )
  }
}

handler.help = ['hd']
handler.tags = ['ia']
handler.command = ['hd']

export default handler