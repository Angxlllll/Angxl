import { proto, generateWAMessage, areJidsSameUser } from "@whiskeysockets/baileys"

export async function all(m, chatUpdate) {
  if (!m || m.isBaileys || !m.message) return

  const msg = m.message

  if (
    !msg.buttonsResponseMessage &&
    !msg.templateButtonReplyMessage &&
    !msg.listResponseMessage &&
    !msg.interactiveResponseMessage
  ) {
    return
  }

  let id = ""
  let text = ""

  /* ===== EXTRAER ID REAL ===== */

  if (msg.buttonsResponseMessage) {
    id = msg.buttonsResponseMessage.selectedButtonId
    text = msg.buttonsResponseMessage.selectedDisplayText
  }

  else if (msg.templateButtonReplyMessage) {
    id = msg.templateButtonReplyMessage.selectedId
    text = msg.templateButtonReplyMessage.selectedDisplayText
  }

  else if (msg.listResponseMessage) {
    id = msg.listResponseMessage.singleSelectReply?.selectedRowId
    text = msg.listResponseMessage.title
  }

  else if (msg.interactiveResponseMessage) {
    try {
      const params = JSON.parse(
        msg.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || "{}"
      )
      id = params.id || ""
      text = params.title || ""
    } catch {
      return
    }
  }

  if (!id) return

  /*
    IMPORTANTE:
    - Tu handler SOLO procesa texto
    - Así que simulamos un mensaje normal
  */

  const fake = await generateWAMessage(
    m.chat,
    { text: id, mentions: m.mentionedJid },
    {
      userJid: this.user.id,
      quoted: m.quoted?.fakeObj
    }
  )

  fake.key.fromMe = areJidsSameUser(m.sender, this.user.id)
  fake.key.id = m.key.id
  fake.pushName = m.pushName || m.name

  if (m.isGroup) {
    fake.key.participant = m.sender
    fake.participant = m.sender
  }

  const upsert = {
    ...chatUpdate,
    messages: [
      proto.WebMessageInfo.fromObject(fake)
    ].map(v => {
      v.conn = this
      return v
    }),
    type: "append"
  }

  this.ev.emit("messages.upsert", upsert)
}