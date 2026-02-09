const handler = async (m, { conn }) => {
  const chat = m.chat

  await conn.sendMessage(chat, {
    react: { text: "👋", key: m.key }
  })

  const listMessage = {
    text: "👋 *Hola*\n\nSelecciona una opción:",
    footer: "Angel Bot",
    title: "Menú rápido",
    buttonText: "Abrir",
    sections: [
      {
        title: "Opciones",
        rows: [
          {
            title: "👑 Owner",
            description: "Información del owner",
            rowId: ".owner"
          },
          {
            title: "📜 Menu",
            description: "Ver el menú completo",
            rowId: ".menu"
          }
        ]
      }
    ]
  }

  await conn.sendMessage(chat, listMessage, { quoted: m })
}

handler.help = ["hola"]
handler.tags = ["main"]
handler.command = /^\.?(hola)$/i

export default handler