import { resolve as resolvePath } from 'path';
import { readFileSync } from 'fs';

/**
 * @fileoverview War Command - Chửi liên tục với lyrics tùy chỉnh
 * @author NhatCoder
 * @version 2.0.0
 * @license MIT
 */

export const config = {
  name: 'chuilientuc',
  aliases: ['c1', 'war1'],
  version: '2.0.0',
  description: 'Gửi tin nhắn war liên tục với lyrics tùy chỉnh',
  usage: '[tag] hoặc stop',
  permissions: [2], // Chỉ admin mới được dùng
  cooldown: 5,
  isAbsolute: false,
  isHidden: false,
  category: 'War',
  credits: 'NhatCoder',
  extra: {
    DELAY: 2000,           // Delay giữa các tin nhắn (2s)
    DELAY_THREAD: 60000    // Delay giữa các lần dùng (1 phút)
  }
};
// Initialize global war tracking
if (!global.c1) {
  global.c1 = new Map();
}

/**
 * Main command execution function
 * @param {Object} param0 - Command parameters
 * @param {Object} param0.message - Message event object
 * @param {Array} param0.args - Command arguments
 */
export async function Running({ message, args }) {
  const { threadID, senderID, mentions, messageID } = message;

  // Validate inputs
  if (!threadID || !senderID) {
    return message.reply('❌ Lỗi: Không thể xác định thông tin người dùng!');
  }

  const mentionID = Object.keys(mentions || {})[0];
  const mentionName = mentions?.[mentionID];

  // Handle stop command
  const isStop = args[0]?.toLowerCase() === 'stop';
  if (isStop) {
    if (!global.c1.has(threadID)) {
      return message.reply('⚠️ Không có war nào đang chạy trong nhóm này!');
    }
    global.c1.delete(threadID);
    return message.reply('✅ Đã dừng war thành công!');
  }

  // Validate mention
  if (!mentionID || !mentionName) {
    return message.reply('❌ Vui lòng tag người cần war!\n💡 Sử dụng: /c1 @user hoặc /c1 stop');
  }

  try {
    // Load lyrics from file
    const lyricsPath = resolvePath(global.NVCODER?.Lyrics || './NVCODER/Lyrics', 'c1.json');
    const lyricsData = JSON.parse(readFileSync(lyricsPath, 'utf8'));

    // Check cooldown
    const threadData = global.c1.get(threadID);
    if (threadData) {
      const timeNow = Date.now();
      const timeDiff = timeNow - threadData.time;

      if (timeDiff < config.extra.DELAY_THREAD) {
        const timeLeft = Math.ceil((config.extra.DELAY_THREAD - timeDiff) / 1000);
        return message.reply(`⏰ Vui lòng đợi ${timeLeft}s nữa để sử dụng lại lệnh!`);
      }
    }

    // Set new war session
    global.c1.set(threadID, { time: Date.now() });

    // Prepare mention array
    const mentionArray = [{
      tag: mentionName,
      id: mentionID
    }];

    // Send confirmation message
    message.send(`🔥 Bắt đầu war với ${mentionName}!\n⚠️ Sử dụng "/c1 stop" để dừng.`);

    // Start sending lyrics
    for (let i = 0; i < lyricsData.length; i++) {
      // Check if war is still active
      if (!global.c1.has(threadID)) {
        break;
      }

      const lyric = lyricsData[i];
      if (lyric && lyric.includes('{name}')) {
        const finalMessage = lyric.replace(/{name}/g, mentionName);

        await message.send({
          body: finalMessage,
          mentions: mentionArray
        });
      }

      // Delay between messages
      await new Promise(resolve => setTimeout(resolve, config.extra.DELAY));
    }

    // Clean up after completion
    global.c1.delete(threadID);
    message.send('✅ Đã hoàn thành war!');

  } catch (error) {
    message.reply('❌ Có lỗi xảy ra khi thực hiện lệnh war!');

    // Clean up on error
    if (global.c1.has(threadID)) {
      global.c1.delete(threadID);
    }
  }
}

export default {
  config,
  Running
}
