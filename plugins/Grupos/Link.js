import {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys"

const handler = async (m, { conn }) => {
  await m.react("🔗")

  const chat = m.chat

  const safeFetch = async (url, timeout = 5000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(url, { signal: controller.signal })
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null
    } catch {
      return null
    } finally {
      clearTimeout(id)
    }
  }

  let inviteCode
  try {
    inviteCode = await conn.groupInviteCode(chat)
  } catch {
    return
  }

  const link = `https://chat.whatsapp.com/${inviteCode}`

  let ppBuffer = null
  try {
    const url = await conn.profilePictureUrl(chat, "image")
    ppBuffer = await safeFetch(url, 6000)
  } catch {}

  if (!ppBuffer) {
    ppBuffer = await safeFetch("https://files.catbox.moe/xr2m6u.jpg")
  }

  const meta = await conn.groupMetadata(chat)
  const groupName = meta.subject || "Grupo"

  const buttons = [
    {
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: "𝗖𝗼𝗽𝗶𝗮𝗿 𝗘𝗻𝗹𝗮𝗰𝗲",
        copy_code: link
      })
    }
  ]

  const { imageMessage } = await generateWAMessageContent(
    { image: ppBuffer },
    { upload: conn.waUploadToServer }
  )

  const interactive = generateWAMessageFromContent(
    chat,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage:
            proto.Message.InteractiveMessage.fromObject({
              header:
                proto.Message.InteractiveMessage.Header.fromObject({
                  title: `_*${groupName}*_`,
                  hasMediaAttachment: true,
                  imageMessage
                }),
              body:
                proto.Message.InteractiveMessage.Body.fromObject({
                  text: link
                }),
              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  buttons
                })
            })
        }
      }
    },
    { quoted: m }
  )

  await conn.relayMessage(chat, interactive.message, {
    messageId: interactive.key.id
  })
}

handler.help = ["link"]
handler.tags = ["grupo"]
handler.command = ["link"]
handler.group = true

export default handler