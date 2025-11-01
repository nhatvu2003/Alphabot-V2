const config = {
  name: "ping",
  aliases: ["p"],
  description: "Kiểm tra bot có hoạt động không",
  version: "1.0.0",
  cooldown: 2,
  permissions: [0], // Cho phép tất cả user
  credits: "Test"
}

async function Running({ message, args }) {
  try {
    console.log("🏓 PING COMMAND EXECUTED!");
    console.log(`📝 User ID: ${message.senderID}`);
    console.log(`💬 Thread ID: ${message.threadID}`);

    const response = `🏓 Pong!\n⏰ ${new Date().toLocaleString('vi-VN')}\n💻 Bot hoạt động bình thường!`;

    console.log("📤 Đang gửi tin nhắn...");
    const result = await message.reply(response);
    console.log("✅ Gửi tin nhắn thành công!", result);
    return result;
  } catch (error) {
    console.error("❌ Lỗi trong ping command:", error);
    try {
      await message.reply("❌ Có lỗi xảy ra: " + error.message);
    } catch (replyError) {
      console.error("❌ Không thể gửi tin nhắn lỗi:", replyError);
    }
  }
}

export default {
  config,
  Running
}
