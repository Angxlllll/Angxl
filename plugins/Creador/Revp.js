const handler = async (m) => {
  const plugins = global.plugins || {}

  let total = 0
  let ok = 0
  let errors = []

  for (const [name, plugin] of Object.entries(plugins)) {
    total++

    try {
      const exec =
        typeof plugin === "function"
          ? plugin
          : typeof plugin.default === "function"
            ? plugin.default
            : null

      if (!exec) {
        errors.push(`❌ *Sin función exportada*\n📄 ${name}`)
        continue
      }

      if (!plugin.command) {
        errors.push(`⚠️ *Sin command*\n📄 ${name}`)
        continue
      }

      if (plugin.disabled) {
        errors.push(`🚫 *Plugin deshabilitado*\n📄 ${name}`)
        continue
      }

      ok++
    } catch (e) {
      errors.push(`💥 *Error interno*\n📄 ${name}\n🧨 ${e.message}`)
    }
  }

  let txt = `🧩 *REVISIÓN REAL DE PLUGINS*\n\n`
  txt += `📦 Plugins cargados: ${total}\n`
  txt += `✅ Operativos: ${ok}\n`
  txt += `❌ Con problemas: ${errors.length}\n`

  if (errors.length) {
    txt += `\n──────────────\n`
    txt += errors.join("\n\n")
  }

  await m.reply(txt)
}

handler.command = ["revp"]
handler.owner = true
handler.tags = ["dev"]
handler.help = ["revp"]

export default handler