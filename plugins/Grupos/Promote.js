const handler = async (m, { conn, participants }) => {
  const user =
    m.mentionedJid?.[0] ||
    m.quoted?.sender

  if (!user)
    return m.reply('☁️ *Responde o menciona al usuario*.')

  const participant = participants.find(p => p.id === user)

  if (!participant)
    return m.reply('❌ Usuario no encontrado en el grupo.')

  if (participant.admin)
    return conn.sendMessage(
      m.chat,
      {
        text: `ℹ️ @${user.split('@')[0]} *ya era admin*.`,
        mentions: [user]
      },
      { quoted: m }
    )

  try {
    await conn.groupParticipantsUpdate(m.chat, [user], 'promote')

    await conn.sendMessage(
      m.chat,
      {
        text: `✅ *Admin dado a:* @${user.split('@')[0]}`,
        mentions: [user]
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