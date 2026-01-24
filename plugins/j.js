import chalk from 'chalk'

const handler = async (m, { conn }) => {
  const sender = m.sender.split('@')[0]

  if (!sender || sender.length < 8) {
    return m.reply('⚠️ Número inválido')
  }

  try {
    const code = await conn.requestPairingCode(sender)
    const formatted = code.match(/.{1,4}/g).join('-')

    await conn.sendMessage(
      m.chat,
      {
        text:
          '❐ Vinculación por código\n\n' +
          'Ingresa este código en *Dispositivos vinculados*\n\n' +
          'Código:\n\n' +
          formatted +
          '\n\n⏱ Expira en 1 minuto'
      },
      { quoted: m }
    )
  } catch (e) {
    console.log(chalk.red('PAIRING ERROR:'), e)
    await m.reply('⚠️ No se pudo generar el código.')
  }
}

handler.command = ['code']
handler.tags = ['serbot']
handler.help = ['code']

export default handler