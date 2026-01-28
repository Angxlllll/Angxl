const handler = async (m, { conn, participants }) => {
  const user = m.mentionedJid?.[0] || m.quoted?.sender

  if (!user)
    return m.reply('☁️ *Responde o menciona al usuario*.')

  const target = user.replace(/[^0-9]/g, '')

  const participant = participants.find(p => {
    const jid = (p.jid || p.id || '').replace(/[^0-9]/g, '')
    return jid === target
  })

  if (!participant)
    return m.reply('❌ Usuario no encontrado en el grupo.')

  if (!participant.admin)
    return conn.sendMessage(
      m.chat,
      {
        text: `ℹ️ @${target} *no era admin*.`,
        mentions: [participant.jid || participant.id]
      },
      { quoted: m }
    )

  if (participant.admin === 'superadmin')
    return m.reply('👑 No puedes quitar admin al creador del grupo.')

  try {
    await conn.groupParticipantsUpdate(
      m.chat,
      [participant.jid || participant.id],
      'demote'
    )

    await conn.sendMessage(
      m.chat,
      {
        text: `✅ *Admin quitado a:* @${target}`,
        mentions: [participant.jid || participant.id]
      },
      { quoted: m }
    )
  } catch (e) {
    console.error(e)
    await m.reply('❌ Error al quitar admin.')
  }
}

handler.group = true
handler.admin = true
handler.help = ['demote']
handler.tags = ['grupos']
handler.customPrefix = /^\.?(demote|quitaradmin|removeadmin)/i

export default handler