const config = {
  name: "help",
  _name: {
    "ar_SY": "الاوامر"
  },
  aliases: ["cmds",
    "commands"],
  version: "1.0.3",
  description: "Show all commands or command details",
  usage: "[command] (optional)",
  credits: "XaviaTeam",
  permissions: [2]
}

const langData = {
  "en_US": {
    "help.list": "[ALPHABOT - LÀM CHỦ MỌI SÀN WAR]\n{list}\n\n⇒ Total: {total} commands\n⇒ Use {syntax} [command] to get more information about a command.",
    "help.commandNotExists": "Command {command} does not exists.",
    "help.commandDetails": `
    ⇒ Name: {name}
    ⇒ Aliases: {aliases}
    ⇒ Version: {version}
    ⇒ Description: {description}
    ⇒ Usage: {usage}
    ⇒ Permissions: {permissions}
    ⇒ Category: {category}
    ⇒ Cooldown: {cooldown}
    ⇒ Credits: {credits}
    `,
    "0": "Member",
    "1": "Group Admin",
    "2": "Bot Admin"
  },
  "vi_VN": {
    "help.list": "🌐[𝐀𝐋𝐏𝐇𝐀𝐁𝐎𝐓 - 𝐋𝐀𝐌 𝐂𝐇𝐔 𝐒𝐀𝐍 𝐖𝐀𝐑]🌐\n{list}\n\n⇒ Tổng cộng: {total} lệnh\n⇒ Sử dụng {syntax} [lệnh] để xem thêm thông tin về lệnh.\n〖 𝐂𝐎𝐍𝐓𝐀𝐂𝐓 〗\n",
    "help.commandNotExists": "Lệnh {command} không tồn tại.",
    "help.commandDetails": `
    ⇒ Tên: {name}
    ⇒ Tên khác: {aliases}
    ⇒ Phiên bản: {version}
    ⇒ Mô tả: {description}
    ⇒ Cách sử dụng: {usage}
    ⇒ Quyền hạn: {permissions}
    ⇒ Thể loại: {category}
    ⇒ Thời gian chờ: {cooldown}
    ⇒ Người viết: {credits}
    `,
    "0": "Thành viên",
    "1": "Quản trị nhóm",
    "2": "Quản trị bot"
  },
  "ar_SY": {
    "help.list": "{list}\n\n⇒ المجموع: {total} الاوامر\n⇒ يستخدم {syntax} [امر] لمزيد من المعلومات حول الأمر.",
    "help.commandNotExists": "امر {command} غير موجود.",
    "help.commandDetails": `
    ⇒ اسم: {name}
    ⇒ اسم مستعار: {aliases}
    ⇒ وصف: {description}
    ⇒ استعمال: {usage}
    ⇒ الصلاحيات: {permissions}
    ⇒ فئة: {category}
    ⇒ وقت الانتظار: {cooldown}
    ⇒ الاعتمادات: {credits}
    `,
    "0": "عضو",
    "1": "إدارة المجموعة",
    "2": "ادارة البوت"
  }
}

function getCommandName(commandName) {
  if (global.plugins.commandsAliases.has(commandName)) return commandName;

  for (let [key, value] of global.plugins.commandsAliases) {
    if (value.includes(commandName)) return key;
  }

  return null
}

function checkCommandPermissions(requiredPermissions, userPermissions) {
  // Convert user permissions to permission levels
  const permissionLevels = [];
  
  if (userPermissions.includes('user')) permissionLevels.push(0);
  if (userPermissions.includes('mod') || userPermissions.includes('thread_admin')) permissionLevels.push(1);
  if (userPermissions.includes('admin') || userPermissions.includes('supper_admin')) permissionLevels.push(2);
  
  // Check if user has any of the required permissions
  return requiredPermissions.some(reqPerm => permissionLevels.includes(reqPerm));
}

async function Running({
  message, args, getLang, userPermissions, prefix, data
}) {
  const {
    commandsConfig
  } = global.plugins;
  const commandName = args[0]?.toLowerCase();

  if (!commandName) {
    let commands = {};
    const language = data?.thread?.data?.language || global.config.LANGUAGE || 'en_US';
    for (const [key, value] of commandsConfig.entries()) {
      if (!!value.isHidden) continue;
      if (!!value.isAbsolute ? !(global.config?.ABSOLUTES || []).some(e => e == message.senderID) : false) continue;
      if (!value.hasOwnProperty("permissions")) value.permissions = [0, 1, 2];
      
      // Check permissions properly
      const hasPermission = checkCommandPermissions(value.permissions, userPermissions);
      if (!hasPermission) continue;
      
      if (!commands.hasOwnProperty(value.category)) commands[value.category] = [];
      commands[value.category].push(value._name && value._name[language] ? value._name[language] : key);
    }

    let list = Object.keys(commands)
      .map(category => `〘  ${category.toUpperCase()} 〙\n${commands[category].join(", ")}`)
      .join("\n\n");

    message.reply(getLang("help.list", {
      total: Object.values(commands).map(e => e.length).reduce((a, b) => a + b, 0),
      list,
      syntax: message.args?.[0]?.toLowerCase() || "help"
    }));
  } else {
    const command = commandsConfig.get(getCommandName(commandName, commandsConfig));
    if (!command) return message.reply(getLang("help.commandNotExists", {
      command: commandName
    }));

    const isHidden = !!command.isHidden;
    const isUserValid = !!command.isAbsolute ? global.config?.ABSOLUTES.some(e => e == message.senderID) : true;
    const isPermissionValid = checkCommandPermissions(command.permissions, userPermissions);
    if (isHidden || !isUserValid || !isPermissionValid)
      return message.reply(getLang("help.commandNotExists", {
        command: commandName
      }));

    message.reply(getLang("help.commandDetails", {
      name: command.name,
      aliases: command.aliases.join(", "),
      version: command.version || "1.0.0",
      description: command.description || '',
      usage: `${prefix}${commandName} ${command.usage || ''}`,
      permissions: command.permissions.map(p => getLang(String(p))).join(", "),
      category: command.category,
      cooldown: command.cooldown || 3,
      credits: command.credits || ""
    }).replace(/^ +/gm, ''));
  }
}

export default {
  config,
  langData,
  Running
}
