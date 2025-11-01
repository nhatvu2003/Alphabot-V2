
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============== Helpers ===============
function isWindows() {
  return os.platform() === 'win32';
}

function isTermux() {
  // Dấu hiệu phổ biến của Termux
  return (
    Boolean(process.env.TERMUX_VERSION) ||
    (process.env.PREFIX && process.env.PREFIX.includes('/data/data/com.termux')) ||
    (os.platform() === 'linux' && __dirname.includes('/data/data/com.termux'))
  );
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function getCurrentVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    return pkg.version || 'Không xác định';
  } catch {
    return 'Không xác định';
  }
}

function inGitRepo(cwd) {
  return fileExists(path.join(cwd, '.git'));
}

function run(cmd, opts = {}) {
  const { dryRun = false, cwd = __dirname } = opts;
  if (dryRun) {
    console.log(`[DRY-RUN] ${cmd}`);
    return;
  }
  execSync(cmd, { stdio: 'inherit', cwd });
}

function shouldInstall({ forceInstall, skipInstall }) {
  if (forceInstall) return true;
  if (skipInstall) return false;
  // Mặc định: cài đặt trên Linux/Termux, bỏ qua trên Windows
  if (isWindows()) return false;
  return true;
}

function installCommand(cwd) {
  // Ưu tiên npm ci nếu có lockfile để cài đặt nhanh và ổn định
  const hasCi = fileExists(path.join(cwd, 'package-lock.json'));
  return hasCi ? 'npm ci' : 'npm install';
}

// =============== Core updater ===============
function updateCode(options = {}) {
  const { dryRun = false, forceInstall = false, skipInstall = false } = options;
  const cwd = __dirname;

  try {
    console.log('Đang kiểm tra phiên bản hiện tại...');
    const version = getCurrentVersion();
    console.log('• Phiên bản hiện tại:', version);

    if (inGitRepo(cwd)) {
      console.log('Đang cập nhật code từ repository...');
      // Fetch và pull để lấy thay đổi mới nhất
      run('git fetch --all --prune', { dryRun, cwd });
      run('git pull', { dryRun, cwd });
      console.log('✔ Đã cập nhật code thành công!');
    } else {
      console.warn('⚠ Không phải thư mục Git, bỏ qua bước git pull.');
    }

    const doInstall = shouldInstall({ forceInstall, skipInstall });
    if (doInstall) {
      if (isTermux()) {
        console.log('Đang cài đặt lại các package cho Termux...');
      } else if (!isWindows()) {
        console.log('Đang cài đặt lại các package trên Linux...');
      }

      if (isWindows()) {
        console.warn('Cảnh báo: Alphabot chỉ hỗ trợ cài package trên Termux hoặc Linux. Bỏ qua bước cài đặt trên Windows.');
      } else {
        const cmd = installCommand(cwd);
        run(cmd, { dryRun, cwd });
        console.log('✔ Cài đặt package thành công!');
      }
    } else {
      console.log('Bỏ qua bước cài đặt package (theo cấu hình).');
    }

    console.log('Hoàn tất. Vui lòng khởi động lại bot để áp dụng thay đổi.');
  } catch (err) {
    console.error('✖ Lỗi khi update:', err?.message || err);
    process.exitCode = 1;
  }
}

// =============== CLI ===============
function parseArgs(argv) {
  const args = new Set();
  const kv = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.split('=');
      if (v === undefined) args.add(k); else kv[k] = v;
    }
  }
  return { args, kv };
}

function printUsage() {
  console.log(`\nCách dùng: node update.js [--dry-run] [--skip-install] [--force-install]\n\n` +
    `Tuỳ chọn:\n` +
    `  --dry-run        Chạy mô phỏng (không thực thi git/npm)\n` +
    `  --skip-install   Bỏ qua bước cài đặt package\n` +
    `  --force-install  Luôn cài đặt package dù đang chạy trên Windows\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const { args } = parseArgs(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    printUsage();
  } else {
    updateCode({
      dryRun: args.has('--dry-run'),
      skipInstall: args.has('--skip-install'),
      forceInstall: args.has('--force-install')
    });
  }
}

export { updateCode };
