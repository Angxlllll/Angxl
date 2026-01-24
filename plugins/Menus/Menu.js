let MENU_CACHE = null
let MENU_TS = 0
const MENU_TTL = 30_000

let handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, { react: { text: "🔥", key: m.key } })

  let d = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Mexico_City"
    })
  )

  let locale = "es"
  let week = d.toLocaleDateString(locale, { weekday: "long" })
  let date = d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  })

  let hourNow = d
    .toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
    .replace("a. m.", "A.M")
    .replace("p. m.", "P.M")

  let userId = m.mentionedJid?.[0] || m.sender
  let uptime = clockString(process.uptime() * 1000)

  if (MENU_CACHE && Date.now() - MENU_TS < MENU_TTL) {
    return conn.sendMessage(
      m.chat,
      {
        image: { url: global.banner },
        caption: MENU_CACHE,
        contextInfo: { mentionedJid: [userId] }
      },
      { quoted: m }
    )
  }

  let categories = {}
  for (let plugin of Object.values(global.plugins || {})) {
    if (!plugin?.help || !plugin?.tags) continue
    for (let tag of plugin.tags) {
      if (!categories[tag]) categories[tag] = []
      categories[tag].push(...plugin.help.map(cmd => `.${cmd}`))
    }
  }

  if (!Object.keys(categories).length) {
    categories["𝖬𝖤𝖭𝖴"] = ["𝖭𝗈 𝗁𝖺𝗒 𝖼𝗈𝗆𝖺𝗇𝖽𝗈𝗌 𝖼𝖺𝗋𝗀𝖺𝖽𝗈𝗌"]
  }

  let menuText = `
\`\`\`${week}, ${date}
${hourNow} 𝖬𝖾𝗑𝗂𝖼𝗈 𝖢𝗂𝗍𝗒\`\`\`

Hola @${userId.split("@")[0]} 𝖬𝖾 𝖫𝗅𝖺𝗆𝗈 ${global.namebot}, 𝖤𝗌𝗉𝖾𝗋𝗈 𝖰𝗎𝖾 𝖲𝖾𝖺 𝖣𝖾 𝖬𝗎𝖼𝗁𝖺 𝖴𝗍𝗂𝗅𝗂𝖽𝖺𝖽 

𝖳𝗂𝖾𝗆𝗉𝗈 𝖠𝖼𝗍𝗂𝗏𝗈: ${uptime}
`.trim()

  for (let [tag, cmds] of Object.entries(categories)) {
    let tagName = tag.toUpperCase().replace(/_/g, " ")
    menuText += `

╭─── ${tagName} ──╮
${cmds.map(cmd => `⭒ ִֶָ७ ꯭🔥˙⋆｡ - ${cmd}`).join("\n")}
╰──────────╯`
  }

  MENU_CACHE = menuText
  MENU_TS = Date.now()

  await conn.sendMessage(
    m.chat,
    {
      image: { url: global.banner },
      caption: menuText,
      contextInfo: { mentionedJid: [userId] }
    },
    { quoted: m }
  )
}

handler.command = ["menu", "menú", "help", "menuall"]
handler.help = ["𝖬𝖾𝗇𝗎𝖺𝗅𝗅"]
handler.tags = ["𝖬𝖤𝖭𝖴𝖲"]

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h}h ${m}m ${s}s`
}