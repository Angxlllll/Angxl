import {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys"

const handler = async (m, { conn }) => {
  const chat = m.chat

  await conn.sendMessage(chat, {
    react: { text: "🔗", key: m.key }
  })

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

  try {
    const meta = await conn.groupMetadata(chat)
    const groupName = meta.subject || "Grupo"

    let inviteCode = null
    try {
      inviteCode = await conn.groupInviteCode(chat)
    } catch {}

    if (!inviteCode) return

    const link = `https://chat.whatsapp.com/${inviteCode}`

    const fallbackPP = "https://files.catbox.moe/xr2m6u.jpg"
    let ppBuffer = null

    try {
      const url = await conn.profilePictureUrl(chat, "image").catch(() => null)
      if (url) ppBuffer = await safeFetch(url, 6000)
    } catch {}

    if (!ppBuffer) {
      ppBuffer = await safeFetch(fallbackPP)
    }

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
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: `_*${groupName}*_`,
                hasMediaAttachment: true,
                imageMessage
              }),
              body: proto.Message.InteractiveMessage.Body.create({
                text: `${link}`
              }),
              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  buttons,
                  messageParamsJson: ""
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
  } catch (err) {
    console.error("⚠️ Error en comando .link:", err)
  }
}

handler.help = ["𝖫𝗂𝗇𝗄"]
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"]
handler.customPrefix = /^\.?(link)$/i
handler.command = new RegExp()
handler.group = true

export default handler