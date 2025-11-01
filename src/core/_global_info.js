import {
  resolve as resolvePath
} from "path";
import axios from "axios";

const _global = {
  mainPath: resolvePath(process.cwd()),
  CorePath: resolvePath(process.cwd(), "src"),
  cachePath: resolvePath(process.cwd(), "src", "core", "data", "cache"),
  assetsPath: resolvePath(process.cwd(), "src", "core", "assets"),
  scriptCache: resolvePath(process.cwd(), "src", "commands", "cache"),
  config: new Object(),
  modules: new Map(),
  getLang: null,
  // Plugins:
  pluginsPath: resolvePath(process.cwd(), "src", "plugins"),
  plugins: new Object({
    commands: new Map(),
    commandsAliases: new Map(),
    commandsConfig: new Map(),
    customs: new Number(0),
    events: new Map(),
    onMessage: new Map(),
  }),
  client: new Object({
    cooldowns: new Map(),
    replies: new Map(),
    reactions: new Map(),
  }),
  // Data
  data: new Object({
    models: new Object(),
    users: new Map(),
    threads: new Map(),
    langPlugin: new Object(),
    langSystem: new Object(),
    messages: new Array(),
    temps: new Array(),
  }),
  listenMqtt: null,
  api: null,
  botID: null,
  updateJSON: null,
  updateMONGO: null,
  controllers: null,
  //xva_api: null,
  //xva_ppi: null,
  server: null,
  refreshState: null,
  refreshMqtt: null,
  mongo: null,
  restart: restart,
  shutdown: shutdown,
  maintain: false,
};

function _change_prototype_DATA(data) {
  data.users.set = function (key, value) {
    value.lastUpdated = Date.now();
    return Map.prototype.set.call(this, key, value);
  };

  data.threads.set = function (key, value) {
    value.lastUpdated = Date.now();
    return Map.prototype.set.call(this, key, value);
  };

  return data;
}
async function getDomains() {
  try {
    const response = await axios.get(
      "https://api.nhatcoder.id.vn/gbot/api/domains.json"
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}
async function Sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  })
}
async function _init_global() {
  const domains = await getDomains();

  global.mainPath = _global.mainPath;
  global.CorePath = _global.CorePath;
  global.cachePath = _global.cachePath;
  global.assetsPath = _global.assetsPath;
  // config sẽ được load lại từ file, không dùng _global.config
  global.config = {};
  global.modules = _global.modules;
  global.getLang = _global.getLang;
  // Plugins:
  global.pluginsPath = _global.pluginsPath;
  global.plugins = _global.plugins;

  global.client = _global.client;
  // Data
  global.data = _change_prototype_DATA(_global.data);
  // FCA
  global.listenMqtt = _global.listenMqtt;
  global.api = _global.api;
  global.botID = _global.botID;

  if (!global.updateJSON) global.updateJSON = _global.updateJSON;
  if (!global.updateMONGO) global.updateMONGO = _global.updateMONGO;

  global.controllers = _global.controllers;
  global.server = _global.server;
  global.refreshState = _global.refreshState;
  global.refreshMqtt = _global.refreshMqtt;
  global.mongo = _global.mongo;
  global.restart = _global.restart;
  global.shutdown = _global.shutdown;
  global.maintain = _global.maintain;
}

async function clear() {
  clearInterval(global.refreshState);
  clearInterval(global.refreshMqtt);

  try {
    if (global.server) await global.server.close();
    if (global.mongo) await global.mongo.close();
    if (global.listenMqtt) await global.listenMqtt.stopListening();
  } catch (error) {
    console.log(error);
  }

  for (const global_prop in _global) {
    delete global[global_prop];
  }
  global.gc();
}

async function restart() {
  await clear();
  process.exit(1);
}

async function shutdown() {
  await clear();
  process.exit(0);
}

export default _init_global;
