/**
 * @fileoverview Spam Command - Gửi tin nhắn liên tục
 * @author NhatCoder (Updated from Thành Vũ)
 * @version 2.0.0
 * @license MIT
 */

export const config = {
  name: "spam",
  version: "2.0.0",
  aliases: ['spamv1', 'spv1', 'spam1'],
  description: "Gửi tin nhắn lặp lại liên tục với nội dung tùy chỉnh",
  usage: "[nội dung] hoặc stop",
  permissions: [2], // Chỉ admin được sử dụng
  cooldown: 3,
  isAbsolute: false,
  isHidden: false,
  category: "War",
  credits: "NhatCoder",
  extra: {
    delay: 2000 // Delay 2s giữa các tin nhắn để tránh bị khóa
  }
};
// Initialize global spam tracking
if (!global.Spam) {
  global.Spam = new Set();
}

/**
 * Main spam command execution function
 * @param {Object} param0 - Command parameters
 * @param {Object} param0.message - Message event object
 * @param {Array} param0.args - Command arguments
 */
export async function run({ message, args }) {
  const { threadID, messageID } = message;

  // Validate inputs
  if (!threadID) {
    return message.reply('❌ Lỗi: Không thể xác định ID nhóm!');
  }

  // Handle stop command
  const isStop = args[0]?.toLowerCase() === 'stop';
  if (isStop) {
    if (global.Spam.has(threadID)) {
      global.Spam.delete(threadID);
      return message.reply('✅ Đã dừng spam thành công!');
    } else {
      return message.reply('⚠️ Không có spam nào đang chạy trong nhóm này!');
    }
  }

  // Get spam content
  const spamContent = args.join(' ').trim();
  if (!spamContent) {
    return message.reply(
      '❌ Vui lòng nhập nội dung cần spam!\n💡 Sử dụng: /spam [nội dung] hoặc /spam stop'
    );
  }

  // Check if already spamming
  if (global.Spam.has(threadID)) {
    return message.reply('⚠️ Đã có spam đang chạy trong nhóm này! Sử dụng "/spam stop" để dừng.');
  }

  try {
    // Start spam session
    global.Spam.add(threadID);

    // Send confirmation
    message.send(`🔥 Bắt đầu spam: "${spamContent}"\n⚠️ Sử dụng "/spam stop" để dừng.`);

    // Spam loop
    while (global.Spam.has(threadID)) {
      try {
        await message.send(spamContent);
        await new Promise(resolve => setTimeout(resolve, config.extra.delay));
      } catch (error) {
        // Stop spam on error to prevent spam flood
        global.Spam.delete(threadID);
        message.send('❌ Đã dừng spam do lỗi gửi tin nhắn!');
        break;
      }
    }
  } catch (error) {
    global.Spam.delete(threadID);
    message.reply('❌ Có lỗi xảy ra khi thực hiện spam!');
  }
}

// Alias for backward compatibility
export const Running = run;

export default {
  config,
  Running
}
