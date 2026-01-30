// 🎵 TECH BOT V1 - Descarga de audio de YouTube
// Hecho por Ado :D 
import axios from 'axios';
import fetch from 'node-fetch';
import yts from "yt-search";

// 🎵 Cooldown system
const cooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 segundos cooldown

async function downloadYoutubeAudio(videoUrl) {
  try {
    console.log(`🎵 [YTMP3] Iniciando descarga para: ${videoUrl}`);

    // 🎵 Obtener token de captcha
    const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
    const cfPayload = {
      url: 'https://ezconv.cc',
      siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
    };

    console.log(`🎵 [YTMP3] Obteniendo token captcha...`);
    const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);

    if (!cfResponse.success || !cfResponse.result) {
      return {
        success: false,
        error: 'No se pudo obtener el token de captcha'
      };
    }

    const captchaToken = cfResponse.result;
    console.log(`🎵 [YTMP3] Token captcha obtenido`);

    // 🎵 Convertir video a audio
    const convertApiUrl = 'https://ds1.ezsrv.net/api/convert';
    const convertPayload = {
      url: videoUrl,
      quality: '320',
      trim: false,
      startT: 0,
      endT: 0,
      captchaToken: captchaToken
    };

    console.log(`🎵 [YTMP3] Enviando petición de conversión...`);
    const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos timeout
    });

    if (convertResponse.status !== 'done') {
      return {
        success: false,
        error: `La conversión falló. Estado: ${convertResponse.status}`
      };
    }

    console.log(`🎵 [YTMP3] Conversión exitosa: ${convertResponse.title}`);

    return {
      success: true,
      data: {
        title: convertResponse.title,
        downloadUrl: convertResponse.url,
        status: convertResponse.status,
        quality: '320kbps'
      }
    };

  } catch (error) {
    console.error(`🎵 [YTMP3] Error:`, error.message);
    return {
      success: false,
      error: error.response?.data ? JSON.stringify(error.response.data) : error.message
    };
  }
}

// 🎵 Función para buscar música por nombre
async function searchMusicByName(query) {
  try {
    console.log(`🎵 [SEARCH] Buscando: "${query}"`);

    const search = await yts(query);

    if (!search.videos || !search.videos.length) {
      return {
        success: false,
        error: 'No se encontraron resultados'
      };
    }

    // Tomar el primer resultado
    const video = search.videos[0];

    return {
      success: true,
      data: {
        title: video.title,
        url: video.url,
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        duration: video.timestamp,
        channel: video.author.name,
        views: video.views.toLocaleString()
      }
    };

  } catch (error) {
    console.error(`🎵 [SEARCH] Error:`, error);
    return {
      success: false,
      error: 'Error en la búsqueda'
    };
  }
}

// 🎵 Handler principal para .play (búsqueda por nombre)
let handler = async (m, { conn, args }) => {
  const userId = m.sender;

  // 🎵 Verificar cooldown
  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId);
    const remaining = expire - Date.now();
    if (remaining > 0) {
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`);
    }
  }

  // 🎵 Verificar si hay búsqueda
  if (!args[0]) {
    return m.reply(`🎵 *Usa:* .play <nombre de canción>\nEjemplo: .play bad bunny tití me preguntó`);
  }

  const searchQuery = args.join(' ');

  // 🎵 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);

  try {
    const searchMsg = await m.reply(`🔍 *Buscando:* "${searchQuery}"\n⚡ *Michi wabot* procesando...`);

    // 🎵 Buscar música por nombre
    const searchResult = await searchMusicByName(searchQuery);

    if (!searchResult.success) {
      cooldowns.delete(userId);
      await conn.sendMessage(m.chat, {
        text: `❌ *No se encontró:* "${searchQuery}"\n\n⚡ Intenta con otro nombre.`,
        edit: searchMsg.key
      });
      return;
    }

    const { title, url, thumbnail, duration, channel, views } = searchResult.data;

    // 🎵 Mostrar información del video encontrado
    await conn.sendMessage(m.chat, {
      text: `✅ *VIDEO ENCONTRADO*\n\n🎵 *Título:* ${title}\n👤 *Canal:* ${channel}\n⏱️ *Duración:* ${duration}\n👁️ *Vistas:* ${views}\n\n⚡ *Michi wabot* descargando audio...`,
      edit: searchMsg.key
    });

    // 🎵 Descargar audio usando la URL encontrada
    const audioResult = await downloadYoutubeAudio(url);

    if (!audioResult.success) {
      cooldowns.delete(userId);
      await conn.sendMessage(m.chat, {
        text: `❌ *Error en descarga*\n\n${audioResult.error}\n\n⚡ Intenta más tarde.`,
        edit: searchMsg.key
      });
      return;
    }

    const { downloadUrl, quality } = audioResult.data;

    // 🎵 Limpiar nombre del archivo
    const cleanTitle = title
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '')
      .substring(0, 50)
      .trim();

    const fileName = `${cleanTitle}.mp3`;

    // 🎵 Informar que se está descargando
    await conn.sendMessage(m.chat, {
      text: `📥 *DESCARGANDO AUDIO*\n\n🎵 ${title}\n🔊 Calidad: ${quality}\n⏳ Descargando...`,
      edit: searchMsg.key
    });

    // 🎵 Descargar buffer del audio
    const audioResponse = await fetch(downloadUrl);

    if (!audioResponse.ok) {
      throw new Error(`Error HTTP: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.buffer();

    if (audioBuffer.length === 0) {
      throw new Error('Audio vacío');
    }

    // 🎵 Enviar audio
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: fileName,
      caption: `✅ *AUDIO DESCARGADO*\n\n🎵 ${title}\n🔊 ${quality}\n👤 ${channel}\n⏱️ ${duration}\n\n⚡ *TECH BOT V1*`,
      quoted: m
    });

    // 🎵 Limpiar cooldown después de éxito
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);

    console.log(`🎵 [PLAY] Audio enviado: ${title}`);

  } catch (error) {
    console.error(`🎵 [PLAY] Error handler:`, error);
    cooldowns.delete(userId);

    // 🎵 Mensajes de error específicos
    const errorMessages = {
      'timeout': '⏳ *TIEMPO AGOTADO*\nEl servidor tardó demasiado.',
      'ENOTFOUND': '❌ *SERVIDOR NO DISPONIBLE*\nIntenta más tarde.',
      'ECONNREFUSED': '❌ *CONEXIÓN RECHAZADA*\nServidor sobrecargado.',
      'default': `❌ *ERROR*\n${error.message}`
    };

    let errorMsg = errorMessages.default;
    if (error.message.includes('timeout')) errorMsg = errorMessages.timeout;
    if (error.message.includes('ENOTFOUND')) errorMsg = errorMessages.ENOTFOUND;
    if (error.message.includes('ECONNREFUSED')) errorMsg = errorMessages.ECONNREFUSED;

  }
}

// 🎵 Handler para .ytmp3 (URL directa)
let handler2 = async (m, { conn, args }) => {
  const userId = m.sender;

  // 🎵 Verificar cooldown
  if (cooldowns.has(userId)) {
    const expire = cooldowns.get(userId);
    const remaining = expire - Date.now();
    if (remaining > 0) {
      return m.reply(`⏳ *Espera ${Math.ceil(remaining / 1000)} segundos* antes de otra descarga.`);
    }
  }

  // 🎵 Verificar URL
  if (!args[0]) {
    return m.reply(`🎵 *Usa:* .ytmp3 <URL de YouTube>\nEjemplo: .ytmp3 https://youtu.be/JiEW1agPqNY`);
  }

  let videoUrl = args[0];

  // 🎵 Validar URL de YouTube
  if (!videoUrl.match(/(youtube\.com|youtu\.be)/)) {
    return m.reply('❌ *URL inválida* - Solo links de YouTube.');
  }

  // 🎵 Extraer ID de video si es necesario
  if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
    videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }

  // 🎵 Activar cooldown
  cooldowns.set(userId, Date.now() + COOLDOWN_TIME);

  try {
    const processingMsg = await m.reply(`🔍 *PROCESANDO AUDIO*\n\nObteniendo información...\n⚡ *Michi wabot* preparando...`);

    // 🎵 Descargar audio
    const result = await downloadYoutubeAudio(videoUrl);

    if (!result.success) {
      cooldowns.delete(userId);
      await conn.sendMessage(m.chat, {
        text: `❌ *ERROR EN DESCARGA*\n\n${result.error}\n\n⚡ Intenta con otro video.`,
        edit: processingMsg.key
      });
      return;
    }

    const { title, downloadUrl, quality } = result.data;

    // 🎵 Limpiar nombre del archivo
    const cleanTitle = title
      .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/gi, '')
      .substring(0, 50)
      .trim();

    const fileName = `${cleanTitle}.mp3`;

    // 🎵 Informar que se está descargando
    await conn.sendMessage(m.chat, {
      text: `📥 *DESCARGANDO AUDIO*\n\n🎵 ${title}\n🔊 Calidad: ${quality}\n⏳ Descargando archivo...`,
      edit: processingMsg.key
    });

    // 🎵 Descargar buffer
    const audioResponse = await fetch(downloadUrl);

    if (!audioResponse.ok) {
      throw new Error(`Error HTTP: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.buffer();

    if (audioBuffer.length === 0) {
      throw new Error('Audio vacío');
    }

    // 🎵 Enviar audio
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: fileName,
      caption: `✅ *AUDIO DESCARGADO*\n\n🎵 ${title}\n🔊 ${quality}\n\n⚡ *Michi wabot*`,
      quoted: m
    });

    // 🎵 Limpiar cooldown después de éxito
    setTimeout(() => {
      cooldowns.delete(userId);
    }, COOLDOWN_TIME);

    console.log(`🎵 [YTMP3] Audio enviado: ${title}`);

  } catch (error) {
    console.error(`🎵 [YTMP3] Error handler:`, error);
    cooldowns.delete(userId);

    // 🎵 Mensajes de error específicos
    const errorMessages = {
      'timeout': '⏳ *TIEMPO AGOTADO*\nEl servidor tardó demasiado.',
      'ENOTFOUND': '❌ *SERVIDOR NO DISPONIBLE*\nIntenta más tarde.',
      'ECONNREFUSED': '❌ *CONEXIÓN RECHAZADA*\nServidor sobrecargado.',
      'default': `❌ *ERROR*\n${error.message}`
    };

    let errorMsg = errorMessages.default;
    if (error.message.includes('timeout')) errorMsg = errorMessages.timeout;
    if (error.message.includes('ENOTFOUND')) errorMsg = errorMessages.ENOTFOUND;
    if (error.message.includes('ECONNREFUSED')) errorMsg = errorMessages.ECONNREFUSED;

    await m.reply(errorMsg);
  }
}

// 🎵 Comandos para .play (búsqueda por nombre)
handler.help = ['play <nombre de canción>'];
handler.tags = ['dl', 'audio'];
handler.command = ['ply', 'pa', 'musica'];

export default handler;