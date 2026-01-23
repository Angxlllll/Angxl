const handler = async (m, { conn, participants }) => {
  const user = m.mentionedJid?.[0] || m.quoted?.sender

  if (!user)
    return m.reply('☁️ *Responde o menciona al usuario*.')

  const targetNum = user.replace(/\D/g, '')

  const participant = participants.find(p =>
    p.id?.replace(/\D/g, '') === targetNum
  )

  if (!participant)
    return m.reply('❌ Usuario no encontrado en el grupo.')

  if (participant.admin)
    return conn.sendMessage(
      m.chat,
      {
        text: `ℹ️ @${targetNum} *ya era admin*.`,
        mentions: [participant.id]
      },
      { quoted: m }
    )

  try {
    await conn.groupParticipantsUpdate(
      m.chat,
      [participant.id],
      'promote'
    )

    await conn.sendMessage(
      m.chat,
      {
        text: `✅ *Admin dado a:* @${targetNum}`,
        mentions: [participant.id]
      },
      { quoted: m }
    )
  } catch {
    await m.reply('❌ Error al dar admin.')
  }
}


handler.group = true
handler.admin = true
handler.customPrefix = /^\.?(promote|daradmin|addadmin)/i
handler.help = ["𝖯𝗋𝗈𝗆𝗈𝗍𝖾"];
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"];
export default handler