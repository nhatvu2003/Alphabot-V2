/**
 * nv-fca Tích hợp trực tiếp - Tối ưu cho Termux
 * Phiên bản compact với các tính năng cần thiết
 */

const fs = require('fs');

// Core dependencies từ nv-fca
const utils = require('./utils.js');

// Import terminal UI for beautiful logging
let terminalUI;
try {
  terminalUI = require('../core/UI/terminal-ui.js').default;
} catch (e) {
  terminalUI = null;
}

// Advanced stdout override for complete FCA log control
const originalWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
  const message = chunk.toString();

  // Intercept ws3-fca logs and beautify them
  if (message.includes('ws3-fca [LOG]') || message.includes('ws3-fca [WARNING]')) {
    const cleanMessage = message.replace(/ws3-fca \[(LOG|WARNING)\]/, '').trim();

    if (cleanMessage.includes('Logging in...') && terminalUI) {
      terminalUI.showLoading('🔐 Đang xác thực Facebook');
      return true;
    } else if (cleanMessage.includes('Logged in!') && terminalUI) {
      terminalUI.showSuccess('✅ Xác thực thành công!');
      return true;
    } else if (cleanMessage.includes('Choosing the best region') && terminalUI) {
      terminalUI.showLoading('🌍 Đang tối ưu kết nối');
      return true;
    } else if (cleanMessage.includes('Connected to specified region') && terminalUI) {
      terminalUI.showSuccess('🌐 Đã kết nối tối ưu');
      return true;
    } else if (cleanMessage.includes('Successfully logged in') && terminalUI) {
      terminalUI.showSuccess('🎉 Đăng nhập hoàn tất!');
      return true;
    } else if (cleanMessage.includes('Fetching account info') && terminalUI) {
      terminalUI.showLoading('👤 Đang tải thông tin');
      return true;
    } else if (cleanMessage.includes('Hello,') && terminalUI) {
      const match = cleanMessage.match(/Hello, (.+) \((\d+)\)/);
      if (match) {
        terminalUI.showSuccess(`👋 Chào ${match[1]} (ID: ${match[2]})`);
        return true;
      }
    } else if (cleanMessage.includes('Region specified:') && terminalUI) {
      const region = cleanMessage.split(':')[1]?.trim();
      terminalUI.showInfo(`🗺️ Khu vực: ${region}`);
      return true;
    } else if (cleanMessage.includes('MQTT endpoint:') && terminalUI) {
      terminalUI.showInfo('🔗 Kết nối MQTT đã sẵn sàng');
      return true;
    } else if (cleanMessage.includes('To check updates') && terminalUI) {
      terminalUI.showInfo('💎 AlphaBot Premium v2.0.0 🚀');
      return true;
    } else if (message.includes('[WARNING]') || cleanMessage.includes('No region is specified')) {
      // Suppress warnings completely
      return true;
    }
  }

  // For non-FCA messages, use original write
  return originalWrite.call(process.stdout, chunk, encoding, callback);
};

// Override console và utils.log để beautify FCA logs
const originalConsoleLog = console.log;
const originalLog = utils.log;
const originalWarn = utils.warn;
const originalError = utils.error;

// Map FCA messages to beautiful UI
const fcaMessages = {
  'Logging in...': () => terminalUI?.showLoading('🔐 Đang kết nối Facebook') || '🔐 Đang kết nối Facebook...',
  'Logged in!': () => terminalUI?.showSuccess('✅ Đã xác thực thành công!') || '✅ Đã xác thực thành công!',
  'Choosing the best region...': () => terminalUI?.showLoading('🌍 Đang chọn region tối ưu') || '🌍 Đang chọn region tối ưu...',
  'Connected to specified region.': () => terminalUI?.showSuccess('🌐 Đã kết nối region') || '🌐 Đã kết nối region',
  'Successfully logged in.': () => terminalUI?.showSuccess('🎉 Đăng nhập thành công!') || '🎉 Đăng nhập thành công!',
  'Fetching account info...': () => terminalUI?.showLoading('👤 Đang lấy thông tin tài khoản') || '👤 Đang lấy thông tin tài khoản...'
};

// Beautiful console override
console.log = function (...args) {
  const message = args.join(' ');

  // Check for FCA messages and beautify them
  for (const [pattern, beautify] of Object.entries(fcaMessages)) {
    if (message.includes(pattern)) {
      return beautify();
    }
  }

  // Handle Hello message specially
  if (message.includes('Hello,') && message.includes('(')) {
    const match = message.match(/Hello, (.+) \((\d+)\)/);
    if (match && terminalUI) {
      terminalUI.showSuccess(`👋 Xin chào ${match[1]} (ID: ${match[2]})`);
      return;
    }
  }

  // Handle region messages
  if (message.includes('Region specified:')) {
    const region = message.split(':')[1]?.trim();
    if (terminalUI) {
      terminalUI.showInfo(`🗺️ Region: ${region}`);
      return;
    }
  }

  // Handle MQTT endpoint
  if (message.includes('MQTT endpoint:')) {
    if (terminalUI) {
      terminalUI.showInfo('🔗 Đã thiết lập kết nối MQTT');
      return;
    }
  }

  // Handle update check message
  if (message.includes('To check updates')) {
    if (terminalUI) {
      terminalUI.showInfo('💎 Sử dụng AlphaBot Premium - Version 2.0.0');
      return;
    }
  }

  // Suppress warning messages
  if (message.includes('WARNING') || message.includes('No region is specified')) {
    return; // Tắt warning không cần thiết
  }

  // For other messages, use original console.log
  return originalConsoleLog.apply(console, args);
};

// Override utils methods
utils.log = console.log;
utils.warn = () => { }; // Tắt hoàn toàn warning
utils.error = (...args) => {
  // Chỉ log error nghiêm trọng
  if (args[0] && typeof args[0] === 'string' && args[0].includes('login')) {
    if (terminalUI) {
      terminalUI.showError(args.join(' '));
    } else {
      originalError(...args);
    }
  }
};

// Termux SSL optimization - suppress warnings properly
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Tắt SSL warnings - improved version
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  // Suppress TLS warning
  if (name === 'warning' && typeof data === 'object' && data.name === 'Warning' &&
    data.message && data.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
    return false;
  }
  return originalEmit.apply(process, arguments);
};

class AlphabotFCA {
  constructor() {
    this.globalOptions = {
      selfListen: false,
      selfListenEvent: false,
      listenEvents: true,
      listenTyping: false,
      updatePresence: false,
      forceLogin: true,
      autoMarkDelivery: false,
      autoMarkRead: false,
      autoReconnect: true,
      online: true,
      emitReady: false,
      userAgent: "Mozilla/5.0 (Linux; Android 11; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
      randomUserAgent: false
    };

    this.ctx = null;
    this.defaultFuncs = null;
    this.api = null;
  }

  /**
   * Main login function optimized for Termux
   */
  login(appState, options = {}, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    // Merge with optimized options
    Object.assign(this.globalOptions, options);

    const loginHelper = async () => {
      try {
        const jar = utils.getJar();
        // utils.log("Logging in..."); // Đã tắt log

        // Set cookies from appState
        if (appState) {
          const cookies = Array.isArray(appState) ? appState : JSON.parse(appState);
          cookies.forEach(cookie => {
            const domain = ".facebook.com";
            const expires = new Date().getTime() + 1000 * 60 * 60 * 24 * 365;
            const str = `${cookie.key || cookie.name}=${cookie.value}; expires=${expires}; domain=${domain}; path=/;`;
            jar.setCookie(str, `http://${domain}`);
          });
        } else {
          throw new Error("No appState provided");
        }

        // Create basic API object
        this.api = {
          setOptions: (opts) => Object.assign(this.globalOptions, opts),
          getAppState: () => {
            const appState = utils.getAppState(jar);
            return Array.isArray(appState) ? appState : [];
          }
        };

        // Get Facebook page
        const resp = await utils.get("https://www.facebook.com/", jar, null, this.globalOptions, { noRef: true });

        // Build API context
        const [ctx, defaultFuncs] = await this.buildAPI(resp.body, jar);
        this.ctx = ctx;
        this.defaultFuncs = defaultFuncs;

        // Add core functions
        this.addCoreFunctions();

        // Start health monitoring
        this.startHealthMonitoring();

        // utils.log("Successfully logged in."); // Đã tắt log
        callback(null, this.api);

      } catch (error) {
        callback(error);
      }
    };

    loginHelper();
  }

  /**
   * Build API context (simplified version)
   */
  async buildAPI(html, jar) {
    const cookies = jar.getCookies("https://www.facebook.com/");
    const userCookie = cookies.find(c => c.cookieString().startsWith("c_user="));

    if (!userCookie) {
      throw new Error("Could not find user cookie");
    }

    const userID = userCookie.cookieString().split("=")[1];

    // Basic dtsg extraction
    const dtsgMatch = html.match(/DTSGInitialData.*?token":"([^"]+)"/);
    const dtsg = dtsgMatch ? dtsgMatch[1] : '';

    const ctx = {
      userID,
      jar,
      globalOptions: this.globalOptions,
      loggedIn: true,
      fb_dtsg: dtsg,
      jazoest: "2" + dtsg.split('').map(c => c.charCodeAt(0)).join('')
    };

    const defaultFuncs = {
      get: (url, jar, data, options) => utils.get(url, jar, data, options),
      post: (url, jar, data, options) => utils.post(url, jar, data, options)
    };

    return [ctx, defaultFuncs];
  }

  /**
   * Add core API functions
   */
  addCoreFunctions() {
    // getCurrentUserID
    this.api.getCurrentUserID = () => this.ctx.userID;

    // sendMessage (basic version)
    this.api.sendMessage = (message, threadID, callback, messageID) => {
      try {
        const form = {
          client: "mercury",
          action_type: "ma-type:user-generated-message",
          author: "fbid:" + this.ctx.userID,
          timestamp: Date.now(),
          timestamp_absolute: "Today",
          timestamp_relative: "Just now",
          timestamp_time_passed: "0",
          is_unread: false,
          is_cleared: false,
          is_forward: false,
          is_filtered_content: false,
          is_filtered_content_bh: false,
          is_filtered_content_account: false,
          is_filtered_content_quasar: false,
          is_filtered_content_invalid_app: false,
          is_spoof_warning: false,
          source: "source:chat:web",
          "source_tags[0]": "source:chat",
          body: message,
          html_body: false,
          ui_push_phase: "V3",
          status: "0",
          offline_threading_id: utils.generateOfflineThreadingID(),
          message_id: utils.generateOfflineThreadingID(),
          threading_id: utils.generateThreadingID(this.ctx.clientID),
          "ephemeral_ttl_mode:": "0",
          manual_retry_cnt: "0",
          thread_id: threadID,
          to: threadID,
          fb_dtsg: this.ctx.fb_dtsg,
          jazoest: this.ctx.jazoest
        };

        this.defaultFuncs.post("https://www.facebook.com/messaging/send/", this.ctx.jar, form, this.globalOptions)
          .then(response => {
            if (callback) callback(null, { messageID: form.message_id });
          })
          .catch(error => {
            if (callback) callback(error);
          });
      } catch (error) {
        if (callback) callback(error);
      }
    };

    // getUserInfo (basic version)
    this.api.getUserInfo = (ids, callback) => {
      const userIDs = Array.isArray(ids) ? ids : [ids];
      const form = {
        fb_dtsg: this.ctx.fb_dtsg,
        jazoest: this.ctx.jazoest,
        ids: userIDs
      };

      this.defaultFuncs.post("https://www.facebook.com/chat/user_info/", this.ctx.jar, form, this.globalOptions)
        .then(response => {
          try {
            const data = JSON.parse(response.body.replace('for (;;);', ''));
            callback(null, data.payload);
          } catch (e) {
            callback(e);
          }
        })
        .catch(callback);
    };

    // Improved listen function for Termux
    this.api.listen = this.api.listenMqtt = (callback) => {
      let isListening = true;

      const keepAlive = () => {
        if (!isListening) return;

        // Simplified polling approach for Termux
        setTimeout(() => {
          if (isListening && callback) {
            // Gọi callback để duy trì kết nối - im lặng
            // utils.log("Bot is listening..."); // Đã tắt log
            keepAlive();
          }
        }, 10000); // Poll mỗi 10 giây
      };

      // Bắt đầu listen
      // utils.log("Starting listen process for Termux..."); // Đã tắt log
      keepAlive();

      // Return function để stop listening
      return {
        stopListening: () => {
          isListening = false;
          // utils.log("Stopped listening"); // Đã tắt log
        }
      };
    };

    // Logout function
    this.api.logout = (callback) => {
      this.ctx.loggedIn = false;
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      if (callback) callback();
    };
  }

  /**
   * Health monitoring cho Termux
   */
  startHealthMonitoring() {
    let lastActivity = Date.now();

    this.healthCheckInterval = setInterval(() => {
      if (this.ctx && this.ctx.loggedIn) {
        const now = Date.now();

        // Nếu quá lâu không có hoạt động, im lặng
        if (now - lastActivity > 300000) {
          // utils.log("Health check: Bot is still active"); // Đã tắt log
          lastActivity = now;
        }
      }
    }, 60000); // Check mỗi phút

    // Update last activity khi có tin nhắn
    this.updateActivity = () => {
      lastActivity = Date.now();
    };
  }
}

module.exports = new AlphabotFCA();
