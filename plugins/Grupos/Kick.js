const handler = async (m, { conn }) => {
  const target = m.mentionedJid?.[0] || m.quoted?.sender

  if (!target) {
    return m.reply(
      '*🗡️ 𝙼𝚎𝚗𝚌𝚒𝚘𝚗𝚊 𝚘 𝚛𝚎𝚜𝚙𝚘𝚗𝚍𝚎 𝚊𝚕 𝚞𝚜𝚞𝚊𝚛𝚒𝚘 𝚚𝚞𝚎 𝚍𝚎𝚜𝚎𝚊𝚜 𝚎𝚕𝚒𝚖𝚒𝚗𝚊𝚛*'
    )
  }

  await conn.sendMessage(m.chat, {
    react: { text: '🗡️', key: m.key }
  })

  await conn.groupParticipantsUpdate(m.chat, [target], 'remove')

  await conn.sendMessage(
    m.chat,
    { text: '*🗡️ 𝚄𝚂𝚄𝙰𝚁𝙸𝙾 𝙴𝙻𝙸𝙼𝙸𝙽𝙰𝙳𝙾*' },
    { quoted: m }
  )
}

handler.customPrefix = /^\.?kick(\s|$)/i
handler.help = ["𝖪𝗂𝖼𝗄"]
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"]
handler.group = true
handler.admin = true
export default handler