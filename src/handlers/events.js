import { getUserPermissionsFromDB, updateUserPermissions, _Threads, _Users } from './database.js';

var resend;

function checkBanStatus(data = {}, userID) {
  if (
    data?.user?.banned === true ||
    data?.thread?.banned === true ||
    data?.thread?.info?.members?.find((e) => e.userID == userID)?.banned ===
    true
  )
    return true;

  return false;
}

function getExtraEventProperties(event, {
  type, commandName
}) {
  const {
    api
  } = global;
  const {
    threadID,
    messageID,
    senderID,
    userID
  } = event;
  const isReaction = type === "reaction";
  const extraEventProperties = {
    send: function (message, c_threadID = null, c_messageID = null) {
      return new Promise((resolve, reject) => {
        const targetSendID = c_threadID || threadID;
        api.sendMessage(
          message,
          targetSendID,
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(
                messageFunctionCallback(data, targetSendID)
              );
            }
          },
          c_messageID || null
        );
      });
    },
    reply: function (message) {
      return new Promise((resolve,
        reject) => {
        api.sendMessage(
          message,
          threadID,
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(messageFunctionCallback(data, threadID));
            }
          },
          messageID
        );
      });
    },
    react: function (emoji) {
      return new Promise((resolve,
        reject) => {
        api.setMessageReaction(
          emoji,
          messageID,
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          },
          true
        );
      });
    },
  };

  if (isReaction) {
    delete extraEventProperties.reply;
    delete extraEventProperties.react;
  }

  const messageFunctionCallback = (data, targetSendID) => {
    const baseInput = {
      threadID: targetSendID,
      messageID: data.messageID,
      author: isReaction ? userID : senderID,
      author_only: true,
      name: commandName,
    };

    data.addReplyEvent = function (data = {}, standbyTime = 60000) {
      if (typeof data !== "object" || Array.isArray(data)) return;
      if (typeof data.callback !== "function") return;

      const input = Object.assign(baseInput, data);
      global.client.replies.set(input.messageID, input);
      if (standbyTime > 0) {
        setTimeout(() => {
          if (global.client.replies.has(input.messageID)) {
            global.client.replies.delete(input.messageID);
          }
        },
          standbyTime);
      }
    };
    data.addReactEvent = function (data = {},
      standbyTime = 60000) {
      if (typeof data !== "object" || Array.isArray(data)) return;
      if (typeof data.callback !== "function") return;

      const input = Object.assign(baseInput, data);
      global.client.reactions.set(input.messageID, input);
      if (standbyTime > 0) {
        setTimeout(() => {
          if (global.client.reactions.has(input.messageID)) {
            global.client.reactions.delete(input.messageID);
          }
        },
          standbyTime);
      }
    };
    data.unsend = function (delay = 0) {
      const input = Object.assign(baseInput,
        data);
      setTimeout(
        () => {
          api.unsendMessage(input.messageID);
        },
        delay > 0 ? delay : 0
      );
    };

    return data;
  };

  return extraEventProperties;
}

function findCommand(commandName) {
  const commandsAliases = global.plugins.commandsAliases;
  const commands = global.plugins.commands;

  if (commands.has(commandName)) return commandName;

  for (const [command, alias] of commandsAliases) {
    if (alias.includes(commandName)) return command;
  }

  return null;
}

async function getUserPermissions(userID, threadID) {
  try {
    // Kiểm tra nếu userID là admin toàn cầu
    let config = global.config || global.config;

    // Fallback: đọc trực tiếp từ file nếu config chưa load
    if (!config) {
      try {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const configPath = resolve(process.cwd(), 'config', 'config.main.json');
        config = JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (err) {
        return ['user'];
      }
    }

    if (config && (
      (config.ADMINS && config.ADMINS.includes(userID)) ||
      (config.MODERATORS && config.MODERATORS.includes(userID)) ||
      (config.ABSOLUTES && config.ABSOLUTES.includes(userID))
    )) {
      return ['admin', 'supper_admin'];
    }

    // Lấy thông tin thread từ database
    if (threadID) {
      const threadData = await _Threads.get(threadID);
      if (threadData) {
        // Kiểm tra nếu là admin của thread
        if (threadData.info && threadData.info.adminIDs && threadData.info.adminIDs.includes(userID)) {
          return ['thread_admin', 'admin'];
        }

        // Kiểm tra quyền đã được lưu trong database
        const permissions = getUserPermissionsFromDB(threadID, userID);
        if (permissions && permissions.length > 0 && permissions[0] !== 'user') {
          return permissions;
        }
      }
    }

    // Kiểm tra quyền từ dữ liệu user
    const userData = await _Users.get(userID);
    if (userData && userData.permissions) {
      return userData.permissions;
    }

    // Mặc định trả về quyền cơ bản
    return ['user'];
  } catch (error) {
    return ['user'];
  }
}

function checkPermission(permissions, userPermissions) {
  if (permissions.length === 0 || userPermissions.length === 0) return false;

  // Mapping permission levels
  const permissionMap = {
    0: ['user'],
    1: ['user', 'mod'],
    2: ['user', 'mod', 'admin', 'thread_admin'],
    3: ['user', 'mod', 'admin', 'thread_admin', 'supper_admin']
  };

  // Check if user has any of the required permission levels
  for (const requiredLevel of permissions) {
    const requiredPerms = permissionMap[requiredLevel] || [];
    const hasPermission = requiredPerms.some(perm => userPermissions.includes(perm));

    if (hasPermission) {
      return true;
    }
  }

  return false;
}

async function handleCommand(event) {

  const {
    threadID,
    messageID,
    senderID,
    body
  } = event;

  // Tạo args từ body message
  const args = body ? body.trim().split(/\s+/) : [];

  const {
    Threads,
    Users
  } = global.controllers;
  const _thread =
    event.isGroup === true ? (await Threads.get(threadID)) || {} : {};
  const _user = (await Users.get(senderID)) || {};

  const data = {
    thread: _thread,
    user: _user
  };
  if (checkBanStatus(data, senderID)) return;

  const prefix = (_thread?.data?.prefix || global.config.PREFIX || "/")
    .trim()
    .toLowerCase();

  if (args && args.length > 0 && args[0].startsWith(prefix)) {
    const {
      api,
      getLang
    } = global;
    const commandName = findCommand(
      args[0].slice(prefix.length)?.toLowerCase()
    );

    const command = global.plugins.commands.get(commandName) || null;
    const commandInfo = global.plugins.commandsConfig.get(commandName);

    if (command !== null) {
      const {
        cooldowns
      } = global.client;
      const permissions = commandInfo.permissions || [0];
      const userPermissions = await getUserPermissions(senderID, threadID);
      const isAbsoluteUser = global.config?.ABSOLUTES?.some(
        (e) => e == senderID || String(e) === String(senderID)
      ) || false;
      const checkAbsolute = !!commandInfo.isAbsolute
        ? isAbsoluteUser : true;

      const isValidUser =
        checkPermission(permissions, userPermissions) && checkAbsolute;

      if (isValidUser) {
        const userCooldown = cooldowns.get(senderID) || {};
        const isReady =
          !userCooldown[commandName] ||
          Date.now() - userCooldown[commandName] >=
          (commandInfo.cooldown || 3) * 1000;

        if (isReady) {
          const isNSFWEnabled = _thread?.data?.nsfw === true;
          const isCommandNSFW = commandInfo.nsfw === true;

          if (
            (isNSFWEnabled && isCommandNSFW) ||
            !isCommandNSFW ||
            event.isGroup === false
          ) {
            userCooldown[commandName] = Date.now();
            cooldowns.set(senderID, userCooldown);

            let TLang =
              _thread?.data?.language ||
              global.config.LANGUAGE ||
              "en_US";
            const getLangForCommand = (key, objectData) =>
              getLang(key, objectData, commandName, TLang);

            const extraEventProperties = getExtraEventProperties(
              event,
              {
                type: "command", commandName
              }
            );
            Object.assign(event, extraEventProperties);

            const extra = commandInfo.extra || {};

            try {
              command({
                message: event,
                args: [...args].slice(1),
                getLang: getLangForCommand,
                extra,
                data,
                userPermissions,
                prefix,
              });
            } catch (err) {
              console.error(err);
              api.sendMessage(
                getLang("handlers.default.error", {
                  error: String(err.message || err),
                }),
                threadID,
                messageID
              );
            }
          } else {
            api.sendMessage(
              getLang("handlers.commands.nsfwNotAllowed"),
              threadID,
              messageID
            );
          }
        } else {
          api.setMessageReaction("🕓", messageID, null, true);
        }
      }
    }
  }
}

async function handleReaction(event) {
  const {
    threadID,
    messageID,
    userID
  } = event;
  const {
    Threads,
    Users
  } = global.controllers;
  let isValidReaction = global.client.reactions.has(messageID);

  if (isValidReaction) {
    const _thread =
      event.senderID != event.threadID && event.userID != event.threadID
        ? (await Threads.get(threadID)) || {} : {};
    const _user = (await Users.get(userID)) || {};

    const data = {
      user: _user,
      thread: _thread
    };
    if (checkBanStatus(data, userID)) return;

    const {
      api,
      getLang
    } = global;
    const eventData = global.client.reactions.get(messageID);
    const commandName = eventData.name;

    if (eventData.author_only === true && eventData.author !== userID)
      return;

    let TLang =
      _thread?.data?.language || global.config.LANGUAGE || "en_US";
    const getLangForCommand = (key, objectData) =>
      getLang(key, objectData, commandName, TLang);

    const extraEventProperties = getExtraEventProperties(event, {
      type: "reaction",
      commandName,
    });
    Object.assign(event, extraEventProperties);

    const _eventData = Object.assign({}, eventData);
    delete _eventData.callback;

    try {
      eventData.callback({
        message: event,
        getLang: getLangForCommand,
        data,
        eventData: _eventData,
      });
    } catch (err) {
      console.error(err);
      api.sendMessage(
        getLang("handlers.default.error", {
          error: String(err.message || err),
        }),
        threadID,
        messageID
      );
    }
  }
}

async function handleReply(event) {
  const {
    threadID,
    messageID,
    senderID,
    messageReply
  } = event;
  if (!messageReply) return;
  const {
    Threads,
    Users
  } = global.controllers;
  let isValidReply = global.client.replies.has(messageReply.messageID);

  if (isValidReply) {
    const _thread =
      event.isGroup === true ? (await Threads.get(threadID)) || {} : {};
    const _user = (await Users.get(senderID)) || {};

    const data = {
      user: _user,
      thread: _thread
    };
    if (checkBanStatus(data, senderID)) return;

    const {
      api,
      getLang
    } = global;
    const eventData = global.client.replies.get(messageReply.messageID);
    const commandName = eventData.name;

    if (eventData.author_only === true && eventData.author !== senderID)
      return;

    let TLang =
      _thread?.data?.language || global.config.LANGUAGE || "en_US";
    const getLangForCommand = (key, objectData) =>
      getLang(key, objectData, commandName, TLang);

    const extraEventProperties = getExtraEventProperties(event, {
      type: "reply",
      commandName,
    });
    Object.assign(event, extraEventProperties);

    const _eventData = Object.assign({}, eventData);
    delete _eventData.callback;

    try {
      eventData.callback({
        message: event,
        getLang: getLangForCommand,
        data,
        eventData: _eventData,
      });
    } catch (err) {
      console.error(err);
      api.sendMessage(
        getLang("handlers.default.error", {
          error: String(err.message || err),
        }),
        threadID,
        messageID
      );
    }
  }
}

async function handleMessage(event) {
  const {
    api,
    getLang
  } = global;
  const {
    threadID,
    senderID
  } = event;
  const {
    Threads,
    Users
  } = global.controllers;

  const _thread =
    event.isGroup === true ? (await Threads.get(threadID)) || {} : {};
  const _user = (await Users.get(senderID)) || {};

  const data = {
    user: _user,
    thread: _thread
  };
  if (checkBanStatus(data, senderID)) return;

  for (const [name, callback] of global.plugins.onMessage.entries()) {
    try {
      let TLang =
        _thread?.data?.language || global.config.LANGUAGE || "en_US";
      const getLangForCommand = (key, objectData) =>
        getLang(key, objectData, name, TLang);
      const extraEventProperties = getExtraEventProperties(event, {
        type: "message",
        commandName: name,
      });
      Object.assign(event, extraEventProperties);

      callback({
        message: event,
        getLang: getLangForCommand,
        data,
      });
    } catch (err) {
      console.error(err);
    }
  }
}

function handleUnsend(event) {
  if (event.senderID == event.threadID || global.botID == event.threadID)
    return;
  resend.default({
    event
  });
}

function handleEvent(event) {
  if (
    event.type !== "change_thread_image" &&
    (!event.participantIDs || event.participantIDs.length === 0)
  )
    return;
  try {
    switch (event.type) {
      case "event": {
        switch (event.logMessageType) {
          case "log:subscribe":
            global.plugins.events.get("subcribe")({
              event
            });
            break;
          case "log:unsubscribe":
            global.plugins.events.get("unsubcribe")({
              event
            });
            break;
          case "log:user-nickname":
            global.plugins.events.get("user-nickname")({
              event
            });
            break;
          case "log:thread-call":
            global.plugins.events.get("thread-call")({
              event
            });
            break;
          case "log:thread-name":
          case "log:thread-color":
          case "log:thread-icon":
          case "log:thread-approval-mode":
          case "log:thread-admins":
            global.plugins.events.get("thread-update")({
              event
            });
            break;
          default:
            break;
        }
        break;
      }
      case "change_thread_image":
        global.plugins.events.get("change_thread_image")({
          event
        });
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(err);
  }
}

export { getUserPermissions };

export default async function () {


  return {
    handleCommand,
    handleReaction,
    handleReply,
    handleMessage,
    handleUnsend,
    handleEvent,
    getUserPermissions,
  };
}
