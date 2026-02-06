const handler = async (m, { conn, participants }) => {
  const user =
    m.mentionedJid?.[0] ||
    m.quoted?.sender

  if (!user)
    return m.reply('☁️ *Responde o menciona al usuario*.')

  const participant = participants.find(p => p.id === user)
  if (!participant)
    return m.reply('❌ Usuario no encontrado en el grupo.')

  const username = user.split('@')[0]

  if (participant.admin)
    return conn.sendMessage(
      m.chat,
      {
        text: `ℹ️ @${username} *ya era admin*.`,
        mentions: [user]
      },
      { quoted: m }
    )

  try {
    await conn.groupParticipantsUpdate(m.chat, [user], 'promote')

    await conn.sendMessage(
      m.chat,
      {
        text: `✅ *Admin dado a:* @${username}`,
        mentions: [user]
      },
      { quoted: m }
    )
  } catch (e) {
    console.error('[PROMOTE ERROR]', e)
    await m.reply('❌ Error al dar admin.')
  }
}

handler.group = true
handler.admin = true
handler.customPrefix = /^\.?(promote|daradmin|addadmin)/i
handler.help = ['promote']
handler.tags = ['grupos']

export default handler