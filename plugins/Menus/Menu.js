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
      desc:
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖣𝖾𝗆𝗈𝗍𝖾*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖣𝖾𝗅𝖾𝗍𝖾*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖦𝗋𝗎𝗉𝗈 𝖢𝖾𝗋𝗋𝖺𝗋*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖦𝗋𝗎𝗉𝗈 𝖠𝖻𝗋𝗂𝗋*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖪𝗂𝖼𝗄*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖫𝗂𝗇𝗄*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖭𝗈𝗍𝗂𝖿𝗒*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖯𝗋𝗈𝗆𝗈𝗍𝖾*\n' +
        '⭒ ִֶָ७ ꯭📜˙⋆｡ - *𝖳𝗈𝖽𝗈𝗌*',
      image: 'https://files.catbox.moe/m851qr.jpg',
      buttons: [
        { name: 'WhatsApp', url: 'https://wa.me/5215911153853' }
      ]
    },

    {
      name: '_*𝖬𝖤𝖭𝖴 𝖣𝖤𝖲𝖢𝖠𝖱𝖦𝖠𝖲*_\n',
      desc:
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖨𝗇𝗌𝗍𝖺𝗀𝗋𝖺𝗆*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖥𝖺𝖼𝖾𝖻𝗈𝗈𝗄*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖯𝗅𝖺𝗒*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖯𝗅𝖺𝗒2*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖲𝗈𝗎𝗇𝖼𝗅𝗈𝗎𝖽*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖲𝗉𝗈𝗍𝗂𝖿𝗒𝖽𝗅*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖳𝗂𝗄𝗍𝗈𝗄*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖸𝗍𝗆𝗉3*\n' +
        '⭒ ִֶָ७ ꯭🎵˙⋆｡ - *𝖸𝗍𝗆𝗉4*',
      image: 'https://files.catbox.moe/63tppq.jpg',
      buttons: [
        { name: 'WhatsApp', url: 'https://wa.me/5215584393251' }
      ]
    },

    {
      name: '_*𝖬𝖤𝖭𝖴 𝖧𝖤𝖱𝖱𝖠𝖬𝖨𝖤𝖭𝖳𝖠𝖲*_\n',
      desc:
        '⭒ ִֶָ७ ꯭🛠️˙⋆｡ - *𝖣𝖾𝗆𝗈𝗍𝖾*\n' +
        '⭒ ִֶָ७ ꯭🛠️˙⋆｡ - *𝖣𝖾𝗅𝖾𝗍𝖾*\n' +
        '⭒ ִֶָ७ ꯭🛠️˙⋆｡ - *𝖢𝖾𝗋𝗋𝖺𝗋*\n' +
        '⭒ ִֶָ७ ꯭🛠️˙⋆｡ - *𝖠𝖻𝗋𝗂𝗋*\n' +
        '⭒ ִֶָ७ ꯭🛠️˙⋆｡ - *𝖪𝗂𝖼𝗄*\n' +
        '⭒ ִֶָ७ ꯭🛠️˙⋆｡ - *𝖶𝗁𝖺𝗍𝗆𝗎𝗌𝗂𝖼*',
      image: 'https://files.catbox.moe/7kgw8a.jpg',
      buttons: [
        { name: 'Soporte', url: 'https://wa.me/5210000000000' }
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