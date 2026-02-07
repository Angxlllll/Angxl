import fs from 'fs'
import path from 'path'
import syntaxerror from 'syntax-error'

const handler = async (m) => {
  const base = process.cwd()
  const pluginsDir = path.join(base, 'plugins')

  let total = 0
  let conError = 0
  let lista = []

  function scan(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const full = path.join(dir, file)

      if (fs.statSync(full).isDirectory()) {
        scan(full)
        continue
      }

      if (!file.endsWith('.js')) continue

      total++

      const src = fs.readFileSync(full)
      const err = syntaxerror(
        src,
        file,
        { sourceType: 'module', allowAwaitOutsideFunction: true }
      )

      if (err) {
        conError++
        lista.push(
          `✗ ${path.relative(pluginsDir, full)}\n${err.message}`
        )
      }
    }
  }

  scan(pluginsDir)

  let text = `📦 *REVISIÓN DE PLUGINS*\n\n`
  text += `• Total: *${total}*\n`
  text += `• Con errores: *${conError}*\n\n`

  if (lista.length) {
    text += `⚠️ *Errores detectados:*\n\n`
    text += lista.join('\n\n')
  } else {
    text += `✅ No se detectaron errores de sintaxis`
  }

  await m.reply(text)
}

handler.command = ['revp']
handler.owner = true
handler.help = ['revp']
handler.tags = ['owner']

export default handler