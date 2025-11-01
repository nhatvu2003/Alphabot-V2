import '../../scripts/cleanup.js';
import { } from 'dotenv/config';
import {
  writeFileSync, unlinkSync
} from 'fs';
import {
  resolve as resolvePath
} from 'path';
import logger from './helpers/console.js';
import terminalUI from './UI/terminal-ui.js';
import coreManager from './core-manager.js';

// Tối ưu SSL cho Termux - với warning suppression
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Suppress TLS warning
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && typeof data === 'object' && data.name === 'Warning' &&
    data.message && data.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};

// Tối ưu memory và performance cho Termux
process.env.UV_THREADPOOL_SIZE = '4';
process.env.NODE_OPTIONS = '--max-old-space-size=512';

// Xử lý uncaught exceptions với UI đẹp
process.on('uncaughtException', (err) => {
  terminalUI.showError('Uncaught Exception: ' + err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  terminalUI.showError('Unhandled Rejection: ' + reason);
});
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const alphabotFCA = require('./fca/index.js');
import handleListen from '../handlers/listen.js';
import environments from './helpers/environments.get.js';
import _init_var from './_init.js';
import _init_global from './_global_info.js';
import BotStatusWriter from './helpers/bot-status-writer.js';
// import startServer from './Dashboard/server/app.js'; // Dashboard không tồn tại
import {
  execSync
} from 'child_process';
import axios from 'axios';

// SSL verification đã được xử lý ở trên
import {
  initDatabase,
  updateJSON,
  updateMONGO,
  _Threads,
  _Users
} from '../handlers/database.js';
import http from 'http';
const {
  isGlitch,
  isTermux
} = environments;

// Telegram import đã được loại bỏ để bảo mật appstate
process.stdout.write(
  String.fromCharCode(27) + "]0;" + "Gbot" + String.fromCharCode(7)
);

process.on('unhandledRejection', (reason, p) => {
  console.error(reason, 'Unhandled Rejection at Promise', p);
});

process.on('uncaughtException', (err, origin) => {
  logger.error("Uncaught Exception: " + err + ": " + origin);
  // Không thoát ngay mà thử khôi phục
  if (global.api && global.api.listen) {
    setTimeout(() => {
      logger.system('Đang thử khôi phục kết nối...');
      booting(logger);
    }, 3000);
  }
});

process.on('SIGINT', () => {
  logger.system('Bot đang thoát...');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  logger.system('Bot đang thoát...');
  gracefulShutdown();
});

process.on('exit', () => {
  logger.system('Bot đã thoát.');
});

// Graceful shutdown cho Termux
async function gracefulShutdown() {
  logger.info('Đang tắt bot an toàn...');

  // Stop bot status writer
  if (global.botStatusWriter) {
    global.botStatusWriter.stop();
  }

  // Shutdown Core Services
  if (coreManager && coreManager.shutdown) {
    await coreManager.shutdown();
  }

  if (global.shutdown) {
    global.shutdown();
  } else {
    // Cleanup và thoát
    if (global.api && global.api.logout) {
      try {
        global.api.logout();
      } catch (e) { }
    }
  }

  process.exit(0);
}

// Health check và auto recovery cho Termux
function startHealthCheck() {
  let healthCheckInterval;
  let lastHealthCheck = Date.now();

  // Kiểm tra health mỗi 5 phút
  healthCheckInterval = setInterval(() => {
    if (global.api && global.api.getCurrentUserID) {
      try {
        const currentTime = Date.now();
        if (currentTime - lastHealthCheck > 300000) { // 5 phút
          logger.warn('Detecting potential connection issue, attempting recovery...');

          global.api.getUserInfo(global.botID, (err, data) => {
            if (err) {
              logger.error('Health check failed, restarting connection...');
              clearInterval(healthCheckInterval);
              setTimeout(() => {
                booting(logger);
              }, 2000);
            } else {
              lastHealthCheck = currentTime;
              logger.info('Health check passed');
            }
          });
        }
      } catch (error) {
        logger.error('Health check error:', error);
      }
    }
  }, 60000);

  process.on('beforeExit', () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
  });
}

global.NVCODER = new Object({
  Server: new Object({
    Connect: async (key) => {
      logger.info('Đã tắt kết nối server để tối ưu cho Termux');
      return { data: { status: 'offline', message: 'Server connection disabled for Termux optimization' } };
    }

  }),
  Lyrics: resolvePath(process.cwd(), "data", "user-data", "Lyrics"),
  Storage: resolvePath(process.cwd(), "data", "user-data", "Data")
});
async function start() {
  try {
    // Enhanced startup with beautiful UI
    terminalUI.clearAndShowHeader();
    terminalUI.showCoreStructure();

    // Initialize with fancy loading
    await terminalUI.showFancyLoading('⏳ Khởi tạo Core Services Container...', 1500);
    const stats = await coreManager.initialize();
    terminalUI.showSuccess('✅ Core Services đã khởi tạo!');
    console.log();

    await _init_var();
    if (!global.getLang) {
      global.getLang = (key, data = {}) => {
        const messages = {
          'modules.checkAppstate.noProtection': '🔒 Appstate được bảo mật - không gửi về bên thứ 3',
          'modules.checkAppstate.decrypting': '🔓 Đang giải mã appstate...',
          'modules.checkAppstate.error.noKey': '❌ Không tìm thấy key bảo mật',
          'modules.checkAppstate.error.notSupported': '⚠️ Không hỗ trợ trên hệ thống này'
        };
        return messages[key] || key;
      };
    }

    terminalUI.showSuccess('✅ Core System đã sẵn sàng!');
    terminalUI.showSeparator();

    await initDatabase();
    global.updateJSON = updateJSON;
    global.updateMONGO = updateMONGO;
    global.controllers = {
      Threads: _Threads,
      Users: _Users
    }
    await booting(logger);
    await sendWelecome();
  } catch (err) {
    logger.error(err);
    if (global.shutdown) {
      return global.shutdown();
    } else {
      process.exit(1);
    }
  }
}

function booting(logger) {
  return new Promise((resolve, reject) => {

    logger.custom('Đang tiến hành đăng nhập...', 'LOGIN');

    loginState()
      .then(async api => {
        global.api = api;
        global.botID = api.getCurrentUserID();

        // Cập nhật stats và hiển thị UI đẹp
        coreManager.setBotID(global.botID);
        terminalUI.showSuccess(`✅ Đăng nhập thành công với ID: ${global.botID}`);

        // Show enhanced stats
        const botStats = {
          botID: global.botID,
          commands: coreManager.getCommandCount(),
          events: coreManager.getEventCount()
        };
        terminalUI.showStats(botStats);

        refreshState();;
        global.config.REFRESH ? autoReloadApplication() : null;
        global.listenMqtt = api.listenMqtt ? api.listenMqtt(await handleListen()) : api.listen(await handleListen());
        refreshMqtt();

        // Health check cho Termux
        startHealthCheck();

        // Start bot status writer for dashboard
        global.botStatusWriter = new BotStatusWriter();

        // Show system status và footer
        terminalUI.showSystemStatus();
        terminalUI.showFooter();

        resolve();
      })
      .catch(err => {
        if (isGlitch && global.isExists(resolvePath(process.cwd(), '.data', 'appstate.json'), 'file')) {
          global.deleteFile(resolvePath(process.cwd(), '.data', 'appstate.json'));
          execSync('refresh');
        }
        reject(err);
      })
  });
}

const _12HOUR = 1000 * 60 * 60 * 12;
const _2HOUR = 1000 * 60 * 60 * 2;
function refreshState() {
  global.refreshState = setInterval(() => {
    logger.custom('Đang làm mới trạng thái đăng nhập...',
      'REFRESH');
    const newAppState = global.api.getAppState();
    if (global.config.APPSTATE_PROTECTION === true) {
      if (isGlitch) {
        writeFileSync(resolvePath(process.cwd(), '.data', 'appstate.json'), JSON.stringify(newAppState, null, 2), 'utf-8');
      } else if (isTermux) {
        const APPSTATE_SECRET_KEY = process.env.APPSTATE_SECRET_KEY || global.config.GBOTWAR_CONFIG?.APPSTATE_SECRET_KEY || 'termux-default-key';
        const encryptedAppState = global.modules.get('aes').encrypt(JSON.stringify(newAppState), APPSTATE_SECRET_KEY);
        writeFileSync(resolvePath(global.config.APPSTATE_PATH), JSON.stringify(encryptedAppState), 'utf8');
      } else {

        writeFileSync(resolvePath(global.config.APPSTATE_PATH), JSON.stringify(newAppState, null, 2), 'utf8');
      }
    } else {
      writeFileSync(resolvePath(global.config.APPSTATE_PATH), JSON.stringify(newAppState, null, 2), 'utf8');
    }
  },
    _12HOUR);
}

function refreshMqtt() {
  global.refreshMqtt = setInterval(async () => {
    logger.custom('Đang làm mới kết nối cho Termux...', 'REFRESH');
    try {
      // Với FCA tích hợp, chỉ cần log thông báo
      if (global.listenMqtt && global.listenMqtt.stopListening) {
        global.listenMqtt.stopListening();
      }

      // Khởi tạo lại listen
      const listenFunction = global.api.listenMqtt || global.api.listen;
      if (listenFunction) {
        global.listenMqtt = listenFunction(await handleListen());
      }

      logger.custom('Đã làm mới kết nối thành công', 'REFRESH');
    } catch (error) {
      logger.error('Lỗi khi làm mới kết nối:', error);
    }
  },
    _2HOUR);
}

function autoReloadApplication() {
  setTimeout(() => global.restart(),
    global.config.REFRESH);
}

function loginState() {
  const APPSTATE_PATH = global.config?.APPSTATE_PATH || './appstate.json';
  const APPSTATE_PROTECTION = global.config?.APPSTATE_PROTECTION || false;

  return new Promise((resolve, reject) => {
    global.modules.get('checkAppstate')(APPSTATE_PATH, APPSTATE_PROTECTION)
      .then(appState => {
        const options = global.config.FCA_OPTIONS;

        alphabotFCA.login(appState, options, (error, api) => {
          if (error) {
            reject(error.error || error);
            return;
          }

          console.log('✅ Đăng nhập thành công!');
          console.log('🔒 Appstate được bảo mật - không gửi về bên thứ 3');

          resolve(api);
        });
      })
      .catch(err => {
        reject(err);
      });
  });
}
async function sendWelecome() {
  logger.info('Đã tắt welcome message để tối ưu cho Termux');
  return;
}
start();
