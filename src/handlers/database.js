import { resolve } from "path";
import { writeFileSync, readFileSync, unlinkSync, readdirSync } from "fs";
import Threads from "../core/controllers/thread.js";
import Users from "../core/controllers/user.js";

import mongoose from "mongoose";
import models from "../core/models/index.js";

var _Threads;
var _Users;

function saveFile(path, data) {
  writeFileSync(path, data, "utf8");
}

async function initDatabase() {
  _Threads = Threads();
  _Users = Users();

  const logger = global.modules.get("console");
  const { DATABASE } = global.config;
  const dataPath = resolve(process.cwd(), "data", "logs", "database");
  const cachePath = global.cachePath;

  if (!global.isExists(dataPath, "dir")) {
    global.createDir(dataPath);
  }

  if (!global.isExists(cachePath, "dir")) {
    global.createDir(cachePath);
  }

  if (DATABASE === "JSON") {
    let threadPath = resolve(dataPath, "threads.json");
    let userPath = resolve(dataPath, "users.json");

    if (!global.isExists(threadPath, "file")) {
      saveFile(threadPath, "{}");
    } else {
      let _d = readFileSync(threadPath, "utf8");
      if (!global.isJSON(_d)) {
        logger.warn("threads.json corrupted, resetting...");
        saveFile(threadPath, "{}");
        _d = "{}";
      }

      const _parsed = JSON.parse(_d);

      for (const [key, value] of Object.entries(_parsed)) {
        value.info.adminIDs = value.info.adminIDs.map(
          (e) => e?.id || e
        );
        global.data.threads.set(key, value);
      }
    }

    if (!global.isExists(userPath, "file")) {
      saveFile(userPath, "{}");
    } else {
      let _d = readFileSync(userPath, "utf8");
      if (!global.isJSON(_d)) {
        logger.warn("users.json corrupted, resetting...");
        saveFile(userPath, "{}");
        _d = "{}";
      }

      const _parsed = JSON.parse(_d);

      for (const [key, value] of Object.entries(_parsed)) {
        global.data.users.set(key, value);
      }
    }
  } else if (DATABASE === "MONGO") {
    const { MONGO_URL } = process.env;
    if (!MONGO_URL)
      throw new Error(global.getLang("database.mongo_url_not_found"));

    mongoose.set("strictQuery", false);
    let mongooseConnection = async () => {
      await mongoose.connect(MONGO_URL);
      return mongoose.connection;
    };

    let connection = await mongooseConnection();

    global.mongo = connection;
    global.data.models = models;

    const threads = await models.Threads.find({});
    const users = await models.Users.find({});

    for (const thread of threads) {
      thread.info.adminIDs = thread.info.adminIDs.map((e) => e?.id || e);
      global.data.threads.set(thread.threadID, thread);
    }

    for (const user of users) {
      global.data.users.set(user.userID, user);
    }
  }

  logger.custom(
    global.getLang(`database.init`, { database: DATABASE }),
    "DATABASE"
  );
}

function mapToObj(map) {
  const obj = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value;
  }
  return obj;
}

function updateJSON() {
  const { threads, users } = global.data;
  const { DATABASE_JSON_BEAUTIFY } = global.config;

  const formatData = (data) =>
    DATABASE_JSON_BEAUTIFY
      ? JSON.stringify(data, null, 4)
      : JSON.stringify(data);

  saveFile(
    resolve(process.cwd(), "System", "core", "data", "threads.bak.json"),
    JSON.stringify(mapToObj(threads))
  );
  saveFile(
    resolve(process.cwd(), "System", "core", "data", "threads.json"),
    formatData(mapToObj(threads))
  );
  unlinkSync(
    resolve(process.cwd(), "System", "core", "data", "threads.bak.json")
  );

  saveFile(
    resolve(process.cwd(), "System", "core", "data", "users.bak.json"),
    JSON.stringify(mapToObj(users))
  );
  saveFile(
    resolve(process.cwd(), "System", "core", "data", "users.json"),
    formatData(mapToObj(users))
  );
  unlinkSync(resolve(process.cwd(), "System", "core", "data", "users.bak.json"));
}

async function updateMONGO() {
  const { threads, users } = global.data;
  const { models } = global.data;
  try {
    for (const [key, value] of threads.entries()) {
      await models.Threads.findOneAndUpdate({ threadID: key }, value, {
        upsert: true,
      });
    }

    for (const [key, value] of users.entries()) {
      await models.Users.findOneAndUpdate({ userID: key }, value, {
        upsert: true,
      });
    }
  } catch (e) {
    throw new Error(e);
  }
}

async function handleDatabase(event) {
  const logger = global.modules.get("console");
  const { senderID, userID, threadID } = event;

  const targetID = userID || senderID;
  try {
    if (event.isGroup === true) {
      if (!global.data.threads.has(threadID)) {
        await _Threads.get(threadID);
      } else {
        // Cập nhật thông tin thread định kỳ
        const threadData = global.data.threads.get(threadID);
        const currentTime = Date.now();
        if (!threadData.lastUpdate || (currentTime - threadData.lastUpdate) > 3600000) { // 1 giờ
          await _Threads.get(threadID);
          threadData.lastUpdate = currentTime;
          global.data.threads.set(threadID, threadData);
        }
      }
    }
    if (!global.data.users.has(targetID)) {
      await _Users.get(targetID);
    }
  } catch (e) {
    logger.custom(
      global.getLang(`database.error`, { error: String(e.message || e) }),
      "DATABASE"
    );
  }
}

// Hàm cập nhật quyền user trong thread
async function updateUserPermissions(threadID, userID, permissions) {
  try {
    if (global.data.threads.has(threadID)) {
      const threadData = global.data.threads.get(threadID);
      if (!threadData.permissions) {
        threadData.permissions = {};
      }
      threadData.permissions[userID] = permissions;
      global.data.threads.set(threadID, threadData);

      // Lưu vào database
      const { DATABASE } = global.config;
      if (DATABASE === "JSON") {
        updateJSON();
      } else if (DATABASE === "MONGO") {
        await updateMONGO();
      }

      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Hàm lấy quyền của user từ database
function getUserPermissionsFromDB(threadID, userID) {
  try {
    if (global.data.threads.has(threadID)) {
      const threadData = global.data.threads.get(threadID);
      if (threadData.permissions && threadData.permissions[userID]) {
        return threadData.permissions[userID];
      }
    }
    return ['user'];
  } catch (error) {
    return ['user'];
  }
}

export {
  initDatabase,
  updateJSON,
  updateMONGO,
  handleDatabase,
  updateUserPermissions,
  getUserPermissionsFromDB,
  _Threads,
  _Users,
};
