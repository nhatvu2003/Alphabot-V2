const config = {
  name: "test",
  aliases: ["ping"],
  description: "Test command - Bot response",
  version: "1.0.0",
  cooldown: 3,
  permissions: [0], // Cho phép tất cả user
  credits: "Test"
}

async function Running({ message, args }) {
  try {
    console.log("🧪 TEST COMMAND EXECUTED!");
    console.log(`📝 Args received: ${args}`);

    const response = `✅ Bot hoạt động bình thường!\n⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n📝 Args: ${args.join(' ') || 'Không có'}`;

    await message.reply(response);
    console.log("✅ Test command completed successfully");
  } catch (error) {
    console.error("❌ Error in test command:", error);
    await message.reply("❌ Có lỗi xảy ra trong lệnh test");
  }
}

export default {
  config,
  Running
}
