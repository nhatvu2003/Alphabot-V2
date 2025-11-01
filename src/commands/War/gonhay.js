import { resolve as resolvePath } from 'path';
import { readFileSync } from 'fs';

/**
 * @fileoverview Gonhay Command - Gửi tin nhắn gonhay ngẫu nhiên liên tục
 * @author NhatCoder
 * @version 2.0.0
 * @license MIT
 */

export const config = {
  name: "gonhay",
  aliases: ["n", "nhay"],
  description: "Gửi tin nhắn gonhay ngẫu nhiên từ database",
  usage: "start hoặc stop",
  cooldown: 3,
  permissions: [2],
  isAbsolute: false,
  isHidden: false,
  category: "War",
  credits: "NhatCoder",
  extra: {
    delay: 2000 // Delay 2s giữa các tin nhắn
  }
};

// Initialize global gonhay tracking
if (!global.gonhay) {
  global.gonhay = new Map();
}

/**
 * Main gonhay command execution function
 * @param {Object} param0 - Command parameters
 * @param {Object} param0.message - Message event object
 * @param {Array} param0.args - Command arguments
 */
export async function Running({ message, args }) {
  const { threadID, messageID } = message;    // Validate inputs
  if (!threadID) {
    return message.reply('❌ Lỗi: Không thể xác định ID nhóm!');
  }

  try {
    // Load gonhay messages from file
    const lyricsPath = resolvePath(global.NVCODER?.Lyrics || './NVCODER/Lyrics', 'gonhay.json');
    const gonhayList = JSON.parse(readFileSync(lyricsPath, 'utf8'));

    if (!Array.isArray(gonhayList) || gonhayList.length === 0) {
      return message.reply('❌ Danh sách gonhay trống hoặc không hợp lệ!');
    }

    const command = args[0]?.toLowerCase();

    // Handle stop command
    if (command === 'stop') {
      if (global.gonhay.has(threadID)) {
        global.gonhay.delete(threadID);
        return message.reply('✅ Đã dừng gonhay thành công!');
      } else {
        return message.reply('⚠️ Không có gonhay nào đang chạy trong nhóm này!');
      }
    }

    // Check if already running gonhay
    if (global.gonhay.has(threadID)) {
      return message.reply('⚠️ Đã có gonhay đang chạy trong nhóm này! Sử dụng "/gonhay stop" để dừng.');
    }

    // Start gonhay session
    global.gonhay.set(threadID, { index: 0, startTime: Date.now() });

    // Send confirmation
    message.send('🎭 Bắt đầu gonhay!\n⚠️ Sử dụng "/gonhay stop" để dừng.');

    // Gonhay loop
    while (global.gonhay.has(threadID)) {
      try {
        const sessionData = global.gonhay.get(threadID);
        const currentMessage = gonhayList[sessionData.index];

        await message.send(currentMessage);

        // Update index for next message
        sessionData.index = (sessionData.index + 1) % gonhayList.length;
        global.gonhay.set(threadID, sessionData);

        // Delay before next message
        await new Promise(resolve => setTimeout(resolve, config.extra.delay));

      } catch (error) {
        // Stop on error to prevent spam
        global.gonhay.delete(threadID);
        message.send('❌ Đã dừng gonhay do lỗi gửi tin nhắn!');
        break;
      }
    }

  } catch (error) {
    global.gonhay.delete(threadID);
    message.reply('❌ Có lỗi xảy ra khi thực hiện gonhay!');
  }
}
export default {
  config,
  Running
}
