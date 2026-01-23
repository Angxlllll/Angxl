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

  if (!participant.admin)
    return conn.sendMessage(
      m.chat,
      {
        text: `ℹ️ @${targetNum} *no era admin*.`,
        mentions: [participant.id]
      },
      { quoted: m }
    )

  if (participant.admin === 'superadmin')
    return m.reply('👑 No puedes quitar admin al creador del grupo.')

  try {
    await conn.groupParticipantsUpdate(
      m.chat,
      [participant.id],
      'demote'
    )

    await conn.sendMessage(
      m.chat,
      {
        text: `✅ *Admin quitado a:* @${targetNum}`,
        mentions: [participant.id]
      },
      { quoted: m }
    )
  } catch {
    await m.reply('❌ Error al quitar admin.')
  }
}


handler.group = true
handler.admin = true
handler.help = ["𝖣𝖾𝗆𝗈𝗍𝖾"];
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"];
handler.customPrefix = /^\.?(demote|quitaradmin|removeadmin)/i
export default handler