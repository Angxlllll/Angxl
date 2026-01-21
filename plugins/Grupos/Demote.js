const handler = async (m, { conn, participants }) => {
  const user = m.mentionedJid?.[0] || m.quoted?.sender

  if (!user) {
    return m.reply('☁️ *Responde o menciona al usuario*.')
  }

  const participant = participants.find(p => p.id === user)

  if (!participant) {
    return m.reply('❌ Usuario no encontrado en el grupo.')
  }

  if (!participant.admin) {
    return conn.sendMessage(
      m.chat,
      {
        text: `ℹ️ @${user.split('@')[0]} *no era admin*.`,
        mentions: [user]
      },
      { quoted: m }
    )
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [user], 'demote')

    await conn.sendMessage(
      m.chat,
      {
        text: `✅ *Admin quitado a:* @${user.split('@')[0]}`,
        mentions: [user]
      },
      { quoted: m }
    )

  } catch (e) {
    await m.reply('❌ Error al quitar admin.')
  }
}

handler.group = true
handler.admin = true
handler.help = ["𝖣𝖾𝗆𝗈𝗍𝖾"];
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"];
handler.customPrefix = /^\.?(demote|quitaradmin|removeadmin)/i
export default handler