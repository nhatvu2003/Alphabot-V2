/**
 * @fileoverview Key Command - Hiển thị thông tin liên hệ và bảng giá
 * @author NhatCoder
 * @version 2.0.0
 * @license MIT
 */

export const config = {
  name: "key",
  aliases: ["price", "contact", "info"],
  description: "Hiển thị thông tin liên hệ và bảng giá dịch vụ",
  usage: "",
  permissions: [0, 1, 2], // Tất cả người dùng đều có thể xem
  cooldown: 5,
  isAbsolute: false,
  isHidden: false,
  category: "War",
  credits: "NhatCoder"
};

/**
 * Main key command execution function
 * @param {Object} param0 - Command parameters
 * @param {Object} param0.message - Message event object from Facebook
 */
export async function Running({ message }) {
  const { threadID, messageID } = message; const infoMessage = `
╭─────────────────────────╮
│    🤖 ALPHABOT INFO     │
├─────────────────────────┤
│ �‍� Developer: NhatCoder  │
│ 📱 Zalo/Phone: 0348253995│
│ 🌐 Facebook: fb.com/    │
│    vuminhnhat10092003   │
│ � Website: nhatcoder   │
│    2k3.name.vn          │
├─────────────────────────┤
│      💰 BẢNG GIÁ        │
├─────────────────────────┤
│ 🗓️  1 tháng  →  50k     │
│ 🗓️  3 tháng  → 100k     │
│ 🗓️  1 năm    → 500k     │
│ 🗓️  Vĩnh viễn→1000k     │
├─────────────────────────┤
│ 🏦 BANK: Vietcombank    │
│ 💳 STK: 1027891841      │
│ � Chủ TK: Vu Minh Nhat │
├─────────────────────────┤
│ ✨ Hỗ trợ setup miễn phí │
│ 🔄 Cập nhật thường xuyên│
│ 🎯 Làm chủ sàn war      │
╰─────────────────────────╯

💡 Liên hệ để được tư vấn và hỗ trợ!
🚀 Bot chất lượng cao, giá cả hợp lý!
`;

  try {
    message.reply(infoMessage);
  } catch (error) {
    message.reply('❌ Có lỗi xảy ra khi hiển thị thông tin!');
  }
}

export default {
  config,
  Running
}
