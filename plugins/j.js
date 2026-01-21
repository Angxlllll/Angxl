import { proto, areJidsSameUser } from '@whiskeysockets/baileys'

export async function all(m) {
  try {
    m = smsg(this, m)
    if (!m || m.isBaileys || !m.message) return

    let id
    if (m.message.buttonsResponseMessage) id = m.message.buttonsResponseMessage.selectedButtonId
    else if (m.message.templateButtonReplyMessage) id = m.message.templateButtonReplyMessage.selectedId
    else if (m.message.listResponseMessage) id = m.message.listResponseMessage.singleSelectReply?.selectedRowId
    else if (m.message.interactiveResponseMessage) id = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id
    else return

    if (!id) return

    const textMsg = id.startsWith('.') ? id : '.' + id
    const [cmd, ...args] = textMsg.slice(1).split(/\s+/)
    const command = cmd.toLowerCase()

    for (const name in global.plugins) {
      const plugin = global.plugins[name]
      if (!plugin || plugin.disabled || !plugin.command) continue
      let match = false
      if (Array.isArray(plugin.command)) match = plugin.command.includes(command)
      else if (typeof plugin.command === 'string') match = plugin.command === command
      else if (plugin.command instanceof RegExp) match = plugin.command.test(command)
      if (!match) continue
      plugin.default?.call(this, m, { conn: this, args, command, usedPrefix: '.' })
      break
    }
  } catch(e) {
    console.error('Error al procesar botón:', e)
  }
}