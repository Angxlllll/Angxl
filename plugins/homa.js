import * as baileys from '@whiskeysockets/baileys'

const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = baileys

global.__OWNER_CACHE__ ||= {
  images: new Map(),
  slide: null
}

const OWNERS = [
  {
    name: '𝖠𝗇𝗀𝖾𝗅.𝗑𝗒𝗓',
    desc: '𝖢𝗋𝖾𝖺𝖽𝗈𝗋 𝗒 𝖣𝖾𝗌𝖺𝗋𝗋𝗈𝗅𝗅𝖺𝖽𝗈𝗋 𝖯𝗋𝗂𝗇𝖼𝗂𝗉𝖺𝗅 𝖣𝖾 𝖠𝗇𝗀𝖾𝗅 𝖡𝗈𝗍 👑',
    image: 'https://cdn.russellxz.click/b1af0aef.jpeg',
    buttons: [{ name: 'WhatsApp', url: 'https://wa.me/5215911153853' }]
  },
  {
    name: '𝖠𝗇𝗀𝖾𝗅.𝖿𝗀𝗓',
    desc: '𝖴𝗇𝗈 𝖣𝖾 𝖫𝗈𝗌 𝖨𝗇𝗏𝖾𝗋𝗌𝗂𝗈𝗇𝗂𝗌𝗍𝖺𝗌 𝖯𝗋𝗂𝗇𝖼𝗂𝗉𝖺𝗅𝖾𝗌 🗣️',
    image: 'https://cdn.russellxz.click/295d5247.jpeg',
    buttons: [{ name: 'WhatsApp', url: 'https://wa.me/5215584393251' }]
  }
]

async function getImage(conn, url) {
  if (global.__OWNER_CACHE__.images.has(url))
    return global.__OWNER_CACHE__.images.get(url)

  const { imageMessage } = await generateWAMessageContent(
    { image: { url } },
    { upload: conn.waUploadToServer }
  )

  global.__OWNER_CACHE__.images.set(url, imageMessage)
  return imageMessage
}

async function buildSlide(conn, chat) {
  if (global.__OWNER_CACHE__.slide)
    return global.__OWNER_CACHE__.slide

  const cards = await Promise.all(
    OWNERS.map(async o => {
      const img = await getImage(conn, o.image)

      return {
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `*${o.name}*\n${o.desc}`
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          hasMediaAttachment: true,
          imageMessage: img
        }),
        nativeFlowMessage:
          proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: o.buttons.map(b => ({
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: b.name,
                url: b.url
              })
            }))
          })
      }
    })
  )

  const msg = generateWAMessageFromContent(
    chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage:
            proto.Message.InteractiveMessage.fromObject({
              carouselMessage:
                proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                  cards
                })
            })
        }
      }
    },
    {}
  )

  global.__OWNER_CACHE__.slide = msg
  return msg
}

let handler = async (m, { conn }) => {
  conn.sendMessage(m.chat, { react: { text: '🔥', key: m.key } }).catch(() => {})

  const slide = await buildSlide(conn, m.chat)
  await conn.relayMessage(m.chat, slide.message, {
    messageId: slide.key.id
  })
}

handler.command = handler.help = [
  'owner',
  'creador',
  'donar',
  'cuentas',
  'cuentasoficiales'
]

export default handler