const handler = async (m, { conn }) => {
  if (!m.quoted) {
    return m.reply('Responde al mensaje que deseas eliminar.')
  }

  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        id: m.quoted.key.id,
        fromMe: m.quoted.fromMe,
        participant: m.quoted.fromMe ? undefined : m.quoted.sender
      }
    })

    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        id: m.key.id,
        fromMe: true
      }
    })

  } catch (e) {
    await m.reply('No se pudo eliminar el mensaje.')
  }
}

handler.help = ["𝖣𝖾𝗅𝖾𝗍𝖾"];
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"];
handler.customPrefix = /^\.?(del|delete)$/i;
handler.group = true
handler.admin = true
export default handler