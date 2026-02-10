import fetch from 'node-fetch';

let handler = async(m, { conn, usedPrefix, command }) => {

let txt = 'Pack🔥🔥🔥';

let img = 'https://api.delirius.store/nsfw/girls';

conn.sendMessage(m.chat, { 
        image: { url: img }, 
        caption: txt, 
        footer: dev, 
        buttons: [
            {
                buttonId: `.pack`,
                buttonText: { displayText: 'Siguiente' }
            },
            {
                buttonId: '.tetas',
                buttonText: { displayText: 'Tetas' }
            }
        ],
        viewOnce: true,
        headerType: 4
    }, { quoted: m });
}

handler.help = ['pack'];
handler.tag = ['emox'];
handler.command = ['pack', 'tetas'];

export default handler;