const handler = async (m, { conn }) => {
  await conn.sendMessage(
    m.chat,
    {
      text: '👋 Hola, elige una opción:',
      footer: 'Angel Bot',
      buttons: [
        {
          buttonId: '.menu',
          buttonText: { displayText: 'Menu' },
          type: 1
        },
        {
          buttonId: '.owner',
          buttonText: { displayText: 'Owner' },
          type: 1
        }
      ],
      headerType: 1
    },
    { quoted: m }
  )
}

handler.command = ['hola']
export default handler