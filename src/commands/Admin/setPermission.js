export const config = {
  name: "setpermission",
  aliases: ["setperm"],
  description: "Cài đặt quyền cho người dùng trong group",
  usage: "[reply/tag] [permission_level]",
  permissions: [2], // Chỉ admin mới được dùng
  cooldown: 3,
  isAbsolute: false,
  isHidden: false,
  credits: "NhatCoder"
};

export async function run({
  event,
  api,
  args,
  Users,
  Threads,
  Currencies,
  prefix,
  getLang
}) {
  const { updateUserPermissions } = await import('../../../System/Handlers/database.js');
  const { getUserPermissions } = await import('../../../System/Handlers/events.js');
  const { threadID, messageID, senderID } = event;

  // Kiểm tra quyền của người dùng
  const senderPermissions = await getUserPermissions(senderID, threadID);
  if (!senderPermissions.includes('admin') && !senderPermissions.includes('supper_admin')) {
    return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
  }

  let targetUserID = null;
  let permissionLevel = args[0];

  // Xử lý reply hoặc mention
  if (event.messageReply) {
    targetUserID = event.messageReply.senderID;
  } else if (Object.keys(event.mentions).length > 0) {
    targetUserID = Object.keys(event.mentions)[0];
    permissionLevel = args[1];
  } else if (args[0] && args[1]) {
    targetUserID = args[0];
    permissionLevel = args[1];
  }

  if (!targetUserID) {
    return api.sendMessage("❌ Vui lòng reply hoặc tag người cần cập nhật quyền!", threadID, messageID);
  }

  if (!permissionLevel) {
    return api.sendMessage("❌ Vui lòng nhập level quyền!\n\nCác level có sẵn:\n• user - Người dùng thông thường\n• mod - Moderator\n• admin - Quản trị viên", threadID, messageID);
  }

  // Xác định quyền dựa trên level
  let permissions = [];
  switch (permissionLevel.toLowerCase()) {
    case 'user':
      permissions = ['user'];
      break;
    case 'mod':
    case 'moderator':
      permissions = ['user', 'mod'];
      break;
    case 'admin':
    case 'administrator':
      permissions = ['user', 'mod', 'admin'];
      break;
    default:
      return api.sendMessage("❌ Level quyền không hợp lệ!\n\nCác level có sẵn:\n• user - Người dùng thông thường\n• mod - Moderator\n• admin - Quản trị viên", threadID, messageID);
  }

  try {
    // Cập nhật quyền trong database
    const success = await updateUserPermissions(threadID, targetUserID, permissions);

    if (success) {
      const targetInfo = await Users.get(targetUserID);
      const targetName = targetInfo.name || targetUserID;

      api.sendMessage(
        `✅ Đã cập nhật quyền thành công!\n\n👤 Người dùng: ${targetName}\n🎯 Quyền mới: ${permissions.join(', ')}\n📍 Group: ${threadID}`,
        threadID,
        messageID
      );
    } else {
      api.sendMessage("❌ Có lỗi xảy ra khi cập nhật quyền!", threadID, messageID);
    }
  } catch (error) {
    api.sendMessage("❌ Có lỗi xảy ra khi cập nhật quyền!", threadID, messageID);
  }
}

// Alias for backward compatibility
export const Running = run;

export default {
  config,
  Running
}
