const handler = async (m, { conn }) => {
  if (!m.quoted) {
    return m.reply('Responde al mensaje que deseas eliminar.')
  }

  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.quoted.id,
        participant: m.quoted.sender
      }
    })

    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: true,
        id: m.key.id
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