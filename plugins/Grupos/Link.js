const handler = async (m, { conn }) => {
  const chat = m.chat

  await conn.sendMessage(chat, {
    react: { text: "🔗", key: m.key }
  })

  const safeFetch = async (url, timeout = 5000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(url, { signal: controller.signal })
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null
    } catch {
      return null
    } finally {
      clearTimeout(id)
    }
  }

  try {
    const meta = await conn.groupMetadata(chat)
    const groupName = meta.subject || "Grupo"

    let inviteCode
    try {
      inviteCode = await conn.groupInviteCode(chat)
    } catch {
      return
    }

    if (!inviteCode) return

    const link = `https://chat.whatsapp.com/${inviteCode}`

    const fallbackPP = "https://files.catbox.moe/xr2m6u.jpg"
    let ppBuffer = null

    try {
      const url = await conn.profilePictureUrl(chat, "image").catch(() => null)
      if (url) ppBuffer = await safeFetch(url, 6000)
    } catch {}

    if (!ppBuffer) {
      ppBuffer = await safeFetch(fallbackPP)
    }

    await conn.sendMessage(
      chat,
      {
        image: ppBuffer,
        caption: `🔗 *Enlace del grupo*\n\n*${groupName}*\n${link}`
      },
      { quoted: m }
    )
  } catch (err) {
    console.error("⚠️ Error en comando .link:", err)
  }
}

handler.help = ["𝖫𝗂𝗇𝗄"]
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"]
handler.customPrefix = /^\.?(link)$/i
handler.command = new RegExp()
handler.group = true
export default handler