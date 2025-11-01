const config = {
  name: "atgr",
  aliases: ["atb"],
  description: "Chống đổi tên nhóm",
  usage: "on|off",
  cooldown: 3,
  permissions: [2],
  credits: "Nhật Ngáo"
};

const langData = {
  "vi_VN": {
    "notGroup": "Óc chó sài lệnh kiểu: ",
    "success": "Nhật said: Bố thách chúng mày đổi tên box đó",
    "alreadyOn": "Súc vật đang bất lực kìa:))",
    "alreadyOff": "Đang tắt mà em. On lên 🤣",
    "invalidCommand": "Óc chó sài lệnh kiểu: "
  }
};

async function Running( {
  message, getLang, data
}) {
  if (!data?.thread?.info || !data.thread.info.isGroup) return message.reply(getLang("notGroup"));

  const [input] = message.body.split(" ").slice(1);
  if (!['on', 'off'].includes(input)) return message.reply(getLang("invalidCommand"));

  const _THREAD_DATA_ANTI_SETTINGS = {
    ...(data.thread.data?.antiSettings || {})
  };

  switch (input) {
    case 'on':
      if (_THREAD_DATA_ANTI_SETTINGS.antiChangeGroupName) return message.reply(getLang("alreadyOn"));
      _THREAD_DATA_ANTI_SETTINGS.antiChangeGroupName = true;
      await global.controllers.Threads.updateData(message.threadID, {
        antiSettings: _THREAD_DATA_ANTI_SETTINGS
      });
      return message.reply(getLang("success"));
    case 'off':
      if (!_THREAD_DATA_ANTI_SETTINGS.antiChangeGroupName) return message.reply(getLang("alreadyOff"));
      _THREAD_DATA_ANTI_SETTINGS.antiChangeGroupName = false;
      await global.controllers.Threads.updateData(message.threadID, {
        antiSettings: _THREAD_DATA_ANTI_SETTINGS
      });
      return message.reply(`Mệt rồi bố đi ngủ bye mấy con đĩ nứng lồn tinh trùng khuyết tật`);
    default:
      return message.reply(getLang("invalidCommand"));
  }
}

export default {
  config,
  langData,
  Running
};