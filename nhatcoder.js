import { readFileSync } from 'fs';
import { spawn, execSync } from 'child_process';
import axios from 'axios';
import { } from 'dotenv/config';
import logger from './System/core/helpers/console.js';;
import environments from './System/core/helpers/environments.get.js';
import Banner from './System/Banner.js';
import { resolve as resolvePath } from 'path';
const config = JSON.parse(readFileSync(resolvePath(process.cwd(), "config", "config.main.json")));
const _1_MINUTE = 60000;
let restartCount = 0;
console.clear();
const { isTermux } = environments;
console.clear();
(async () => {
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

    // Check for required Termux packages
    try {
      execSync('which git', { stdio: 'ignore' });
    } catch (err) {
      logger.warn("Git not found. Install with: pkg install git");
    }

    try {
      execSync('which python', { stdio: 'ignore' });
    } catch (err) {
      logger.warn("Python not found. Install with: pkg install python");
    }
  }
})();
// End



async function main() {
  await Banner();
  // Tắt notification và update để tối ưu cho Termux
  // if (config.GBOTWAR_OPTIONS.NOTIFICATION_DISPLAY === true) await notification();
  // await update();
  //await Active();
  //await loadPlugins();
  const child = spawn('node', ['--trace-warnings', '--experimental-import-meta-resolve', '--expose-gc', 'System/Gbot.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });

  child.on("close", async (code) => {
    handleRestartCount();
    if (code !== 0 && restartCount < 5) {
      console.log();
      logger.error(`Lỗi không xác định\n Mã Phiên Lỗi: ${code}`);
      logger.warn("Đang khởi động lại...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      main();
    } else {
      //console.log();
      logger.error("Alphabot V2 đã tự động dừng...");
      process.exit();
    }
  });
};


async function update() {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/nhatcoder2003/Alphabot/main/package.json');
    //const res
    const {
      version
    } = res.data;
    const currentVersion = JSON.parse(readFileSync('./package.json')).version;
    // dynamic import semver so update check doesn't crash when dependencies aren't installed
    let semver;
    try {
      semver = (await import('semver')).default;
    } catch (e) {
      logger.warn('semver module not available, skipping update check. Run `npm install` to enable automatic update checks.');
    }

    if (semver && semver.lt(currentVersion, version)) {
      logger.warn(`Đã có phiên bản mới: ${version}`);
      logger.warn(`Phiên bản hiện tại: ${currentVersion}`);
      logger.warn('Vui lòng cập nhật lên phiên bản mới nhất để sử dụng để có trải nghiệm tốt nhất');

    } else {
      logger.custom("Bạn đang sử dụng phiên bản mới nhất của GBOT WAR rồi.", "UPDATE");
    }
  } catch (err) {
    logger.error('Không thể kết nối tối máy chủ cập nhật.');
  }
}

function handleRestartCount() {
  restartCount++;
  setTimeout(() => {
    restartCount--;
  }, _1_MINUTE);
}
main();
