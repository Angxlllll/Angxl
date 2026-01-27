import * as baileys from '@whiskeysockets/baileys'

const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = baileys

const imageCache = new Map()

let handler = async (m, { conn }) => {

  conn.sendMessage(m.chat, { react: { text: "📜", key: m.key } }).catch(() => {})

  async function createImage(url) {
    if (imageCache.has(url)) return imageCache.get(url)

    const { imageMessage } = await generateWAMessageContent(
      { image: { url } },
      { upload: conn.waUploadToServer }
    )

    imageCache.set(url, imageMessage)
    return imageMessage
  }

  const owners = [
    {
      name: '_*𝖬𝖤𝖭𝖴 𝖦𝖱𝖴𝖯𝖮𝖲*_\n',
      desc: '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖣𝖾𝗆𝗈𝗍𝖾*\n⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖣𝖾𝗅𝖾𝗍𝖾*\n⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖪𝗂𝖼𝗄*\n⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖫𝗂𝗇𝗄*',
      image: 'https://cdn.russellxz.click/b1af0aef.jpeg',
      buttons: [
        { name: 'WhatsApp', url: 'https://wa.me/5215911153853' }
      ]
    },
    {
      name: '𝖠𝗇𝗀𝖾𝗅.𝖿𝗀𝗓',
      desc: '𝖴𝗇𝗈 𝖣𝖾 𝖫𝗈𝗌 𝖨𝗇𝗏𝖾𝗋𝗌𝗂𝗈𝗇𝗂𝗌𝗍𝖺𝗌 𝖯𝗋𝗂𝗇𝖼𝗂𝗉𝖺𝗅𝖾𝗌 🗣️',
      image: 'https://cdn.russellxz.click/295d5247.jpeg',
      buttons: [
        { name: 'WhatsApp', url: 'https://wa.me/5215584393251' }
      ]
    }
  ]

  const cards = await Promise.all(
    owners.map(async owner => {
      const imageMsg = await createImage(owner.image)

      const formattedButtons = owner.buttons.map(btn => ({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: btn.name,
          url: btn.url
        })
      }))

      return {
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `${owner.name}\n${owner.desc}`
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          hasMediaAttachment: true,
          imageMessage: imageMsg
        }),
        nativeFlowMessage:
          proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: formattedButtons
          })
      }
    })
  )

  const slideMessage = generateWAMessageFromContent(
    m.chat,
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

  await conn.relayMessage(
    m.chat,
    slideMessage.message,
    { messageId: slideMessage.key.id }
  )
}

handler.command = ["menu", "menú", "help", "menuall"]
handler.help = ["𝖬𝖾𝗇𝗎𝖺𝗅𝗅"]
handler.tags = ["𝖬𝖤𝖭𝖴𝖲"]

export default handler