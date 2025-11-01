/**
 * @fileoverview Taobox Command - Tạo nhiều nhóm Facebook với thành viên hiện tại
 * @author NhatCoder
 * @version 2.0.0
 * @license MIT
 */

export const config = {
  name: "taobox",
  aliases: ['rb', 'regbox', 'creategroup'],
  description: "Tạo nhiều nhóm Facebook với thành viên từ nhóm hiện tại",
  usage: "[số lượng] [tên nhóm]",
  permissions: [2], // Chỉ admin được sử dụng
  cooldown: 10,
  isAbsolute: false,
  isHidden: false,
  category: "War",
  credits: "NhatCoder",
  extra: {
    delay: 2000,      // Delay giữa các lần tạo nhóm
    maxGroups: 20     // Giới hạn số nhóm tối đa
  }
};
// Initialize global taobox tracking
if (!global.taobox) {
  global.taobox = new Set();
}

/**
 * Main taobox command execution function
 * @param {Object} param0 - Command parameters
 * @param {Object} param0.message - Message event object
 * @param {Array} param0.args - Command arguments
 * @param {Object} param0.Threads - Thread controller
 */
export async function run({ message, args, Threads }) {
  const { threadID, messageID, senderID, isGroup } = message;

  // Validate group context
  if (!isGroup) {
    return message.reply('❌ Lệnh này chỉ có thể sử dụng trong nhóm!');
  }

  // Validate arguments
  if (args.length < 2) {
    return message.reply(
      '❌ Sử dụng: /taobox [số lượng] [tên nhóm]\n💡 Ví dụ: /taobox 5 Nhóm War ABC'
    );
  }

  const groupCount = parseInt(args[0]);
  const groupName = args.slice(1).join(' ').trim();

  // Validate inputs
  if (isNaN(groupCount) || groupCount <= 0) {
    return message.reply('❌ Số lượng nhóm phải là số nguyên dương!');
  }

  if (groupCount > config.extra.maxGroups) {
    return message.reply(
      `❌ Số lượng nhóm tối đa là ${config.extra.maxGroups}!`
    );
  }

  if (!groupName) {
    return message.reply('❌ Vui lòng nhập tên nhóm!');
  }

  // Check if already creating groups
  if (global.taobox.has(threadID)) {
    return message.reply('⚠️ Đang có tiến trình tạo nhóm khác đang chạy!');
  }

  try {
    // Get thread info to get member list
    const threadInfo = await Threads.get(threadID);
    if (!threadInfo || !threadInfo.info || !threadInfo.info.participantIDs) {
      return message.reply('❌ Không thể lấy danh sách thành viên nhóm!');
    }

    // Filter members (exclude sender and bot)
    const members = threadInfo.info.participantIDs.filter(id =>
      id !== senderID && id !== message.api.getCurrentUserID?.()
    );

    if (members.length === 0) {
      return message.reply('❌ Không có thành viên nào để thêm vào nhóm mới!');
    }

    // Start creating groups
    global.taobox.add(threadID);

    message.send(
      `🔄 Bắt đầu tạo ${groupCount} nhóm với tên "${groupName}"\n👥 Số thành viên: ${members.length}\n⏰ Ước tính hoàn thành: ${Math.ceil(groupCount * config.extra.delay / 1000)}s`
    );

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < groupCount && global.taobox.has(threadID); i++) {
      try {
        const finalGroupName = `${groupName} #${i + 1}`;

        const newGroupID = await message.api.createNewGroup(members, finalGroupName);

        if (newGroupID) {
          // Send welcome message to new group
          await message.api.sendMessage(
            `🎉 Chào mừng đến với ${finalGroupName}!\n📱 Nhóm được tạo bởi bot AlphaBot`,
            newGroupID
          );
          successCount++;
        } else {
          failedCount++;
        }

        // Delay between group creation
        await new Promise(resolve => setTimeout(resolve, config.extra.delay));

      } catch (error) {
        failedCount++;
      }
    }

    // Clean up and send final report
    global.taobox.delete(threadID);

    message.send(
      `✅ Hoàn thành tạo nhóm!\n` +
      `📊 Kết quả:\n` +
      `• Thành công: ${successCount}/${groupCount}\n` +
      `• Thất bại: ${failedCount}/${groupCount}\n` +
      `• Thành viên mỗi nhóm: ${members.length}`
    );

  } catch (error) {
    global.taobox.delete(threadID);
    message.reply('❌ Có lỗi xảy ra khi tạo nhóm!');
  }
}

// Alias for backward compatibility
export const Running = run;

export default {
  config,
  Running
}
