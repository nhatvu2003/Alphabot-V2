/**
 * Alphabot - Main Entry Point
 * @author    Nhat Vu
 * @github    https://github.com/nhatvu2003
 * @channel   https://youtube.com/@nvcoder
 * @facebook  https://www.facebook.com/vuminhnhat10092003
 */

// Import core modules
import { resolve as resolvePath } from 'path';
import { spawn } from 'child_process';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import logger from './src/core/helpers/console.js';
import { validateAppState } from './src/core/helpers/appstate-validator.js';
import Banner from './src/core/Banner.js';
import environments from './src/core/helpers/environments.get.js';

// Configuration
const config = JSON.parse(readFileSync(resolvePath(process.cwd(), "config", "config.main.json")));
const _1_MINUTE = 60000;
let restartCount = 0;

console.clear();

const { isTermux } = environments;
const BOT_LOCK_PATH = resolvePath(process.cwd(), 'data', 'bot.lock');

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function writeLock(pid) {
  try { writeFileSync(BOT_LOCK_PATH, String(pid)); } catch (_) {}
}

function clearLock() {
  try { if (existsSync(BOT_LOCK_PATH)) unlinkSync(BOT_LOCK_PATH); } catch (_) {}
}

/**
 * Initialize Alphabot with environment optimizations
 */
async function initialize() {
  // Node.js version check
  if (process.version.slice(1).split('.')[0] < 22) {
    logger.error("Alphabot requires Node 22 or higher. Please update Node.js:");
    logger.info("Termux: pkg update && pkg install nodejs");
    logger.info("System: Install Node.js 22+ from nodejs.org");
    process.exit(0);
  }

  // Termux-specific optimizations
  if (isTermux) {
    logger.info("Termux environment detected. Optimizing for mobile usage...");

    // Set environment variables for better Termux performance
    process.env.NODE_OPTIONS = '--max-old-space-size=512';
    // Reduce noisy logs on mobile unless explicitly overridden
    if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'INFO';

    // Attempt to acquire wake lock if Termux:API is available
    try {
      const wl = spawn('termux-wake-lock', [], { stdio: 'ignore' });
      wl.on('error', () => {/* ignore if termux-api not installed */});
      wl.unref?.();
      logger.info('Requested Termux wake-lock (if Termux:API installed).');
    } catch (_) { /* ignore */ }

    // Memory optimization for mobile devices
    if (global.gc) {
      setInterval(() => {
        if (global.gc) global.gc();
      }, 300000); // Run garbage collection every 5 minutes
    }
  }

  // Display banner
  await Banner();

  // Termux-first UX: if appstate missing/invalid, open the Appstate UI instead of failing login
  try {
    const appstatePathData = resolvePath(process.cwd(), 'data', 'appstate.json');
    const appstatePathRoot = resolvePath(process.cwd(), 'appstate.json');
    const chosenPath = existsSync(appstatePathData) ? appstatePathData : (existsSync(appstatePathRoot) ? appstatePathRoot : null);
    let shouldStartUI = false;
    if (!chosenPath) {
      shouldStartUI = true;
    } else {
      try {
        const raw = readFileSync(chosenPath, 'utf8');
        const parsed = JSON.parse(raw || '[]');
        const { valid } = validateAppState(parsed);
        if (!valid) shouldStartUI = true;
      } catch (_) {
        shouldStartUI = true;
      }
    }

    if (shouldStartUI && isTermux) {
      logger.warn('Appstate chưa sẵn sàng trên Termux. Mở giao diện cập nhật Appstate...');
      await startDashboard();
      return;
    }
  } catch (_) { /* ignore, fallback to start bot */ }

  await startBot();
}

/**
 * Start the web dashboard which will manage bot process
 */
async function startDashboard() {
  const child = spawn('node', [
    'scripts/update-appstate.js'
  ], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });

  child.on("close", async (code) => {
    handleRestartCount();
    if (code !== 0 && restartCount < 5) {
      logger.error(`Dashboard exited with code ${code}. Restarting...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      await startDashboard();
    } else {
      logger.error("Dashboard failed to start after 5 attempts. Exiting...");
      process.exit(1);
    }
  });

  // Handle process termination gracefully
  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Terminating dashboard gracefully...');
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Terminating dashboard gracefully...');
    child.kill('SIGTERM');
    process.exit(0);
  });
}

/**
 * Legacy bot starter (now handled by dashboard)
 */
async function startBot() {
  // Prevent double start: check existing lock
  try {
    if (existsSync(BOT_LOCK_PATH)) {
      const pidStr = readFileSync(BOT_LOCK_PATH, 'utf8').trim();
      const oldPid = Number(pidStr);
      if (!Number.isNaN(oldPid) && isProcessRunning(oldPid)) {
        logger.warn(`Bot is already running (PID ${oldPid}). Skip starting another instance.`);
        return;
      } else {
        clearLock();
      }
    }
  } catch (_) {}

  const child = spawn('node', [
    '--trace-warnings',
    '--experimental-import-meta-resolve',
    '--expose-gc',
    'src/core/Gbot.js'
  ], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });

  // Write lock with child PID
  writeLock(child.pid);

  child.on("close", async (code) => {
    clearLock();
    handleRestartCount();

    if (code !== 0 && restartCount < 5) {
      console.log();
      logger.error(`Lỗi không xác định\nMã Phiên Lỗi: ${code}`);
      logger.warn("Đang khởi động lại...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      startBot();
    } else {
      logger.error("Alphabot V2 đã tự động dừng...");
      process.exit();
    }
  });

  // Handle process termination gracefully
  process.on('SIGINT', () => {
    logger.info('Đang tắt Alphabot...');
    try { clearLock(); } catch(_){}
    child.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Đang tắt Alphabot...');
    try { clearLock(); } catch(_){}
    child.kill();
    process.exit(0);
  });
}

/**
 * Handle restart count to prevent infinite restart loops
 */
function handleRestartCount() {
  restartCount++;
  setTimeout(() => {
    restartCount--;
  }, _1_MINUTE);
}

// Start the application
initialize().catch(error => {
  logger.error('Failed to initialize Alphabot:', error);
  process.exit(1);
});
