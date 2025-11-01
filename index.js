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
import { readFileSync } from 'fs';
import logger from './src/core/helpers/console.js';
import Banner from './src/core/Banner.js';
import environments from './src/core/helpers/environments.get.js';

// Configuration
const config = JSON.parse(readFileSync(resolvePath(process.cwd(), "config", "config.main.json")));
const _1_MINUTE = 60000;
let restartCount = 0;

console.clear();

const { isTermux } = environments;

/**
 * Initialize Alphabot with environment optimizations
 */
async function initialize() {
  // Node.js version check
  if (process.version.slice(1).split('.')[0] < 16) {
    logger.error("Alphabot requires Node 16 or higher. Please update Node.js in Termux:");
    logger.info("Run: pkg update && pkg install nodejs");
    process.exit(0);
  }

  // Termux-specific optimizations
  if (isTermux) {
    logger.info("Termux environment detected. Optimizing for mobile usage...");

    // Set environment variables for better Termux performance
    process.env.NODE_OPTIONS = '--max-old-space-size=512';

    // Memory optimization for mobile devices
    if (global.gc) {
      setInterval(() => {
        if (global.gc) global.gc();
      }, 300000); // Run garbage collection every 5 minutes
    }
  }

  // Display banner
  await Banner();

  // Start the bot directly. Web dashboard / REST API has been disabled in this mode.
  // This avoids spawning the web dashboard process and focuses on the bot runtime only.
  await startBot();
}

/**
 * Start the web dashboard which will manage bot process
 */
async function startDashboard() {
  const child = spawn('node', [
    'src/web/start.js'
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

  child.on("close", async (code) => {
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
    child.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Đang tắt Alphabot...');
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
