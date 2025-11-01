/**
 * Terminal UI Manager - Giao diện terminal đẹp cho Alphabot
 * Tối ưu cho Termux với màu sắc và layout đẹp
 */

import code from '../helpers/code.js';

class TerminalUI {
  constructor() {
    this.colors = {
      primary: code.cyan,
      success: code.green,
      warning: code.yellow,
      error: code.red,
      info: code.blue,
      muted: code.gray,
      highlight: code.magenta,
      accent: code.white && code.white.bold ? code.white.bold : code.white,
      rainbow: [code.red, code.yellow, code.green, code.cyan, code.blue, code.magenta],
      gradient: {
        start: code.cyan,
        mid: code.blue,
        end: code.magenta
      }
    };

    this.symbols = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳',
      bot: '🤖',
      shield: '🛡️',
      rocket: '🚀',
      star: '⭐',
      fire: '🔥',
      crown: '👑',
      diamond: '💎',
      lightning: '⚡',
      gear: '⚙️',
      key: '🔑',
      lock: '🔒',
      unlock: '🔓',
      arrow: '➤',
      bullet: '●',
      check: '✓',
      cross: '✗'
    };

    this.animations = {
      loading: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      dots: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
      pulse: ['◐', '◓', '◑', '◒']
    };
  }

  /**
   * Rainbow text effect
   */
  rainbowText(text, width) {
    let result = '';
    let colorIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char !== ' ') {
        result += this.colors.rainbow[colorIndex % this.colors.rainbow.length](char);
        colorIndex++;
      } else {
        result += char;
      }
    }

    return this.centerText(result, width, false);
  }

  /**
   * Animated loading text
   */
  animatedText(text, style = 'loading') {
    const frames = this.animations[style] || this.animations.loading;
    let frameIndex = 0;

    return setInterval(() => {
      process.stdout.write(`\r${this.colors.info(frames[frameIndex])} ${text}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);
  }

  /**
   * Stop animation
   */
  stopAnimation(interval) {
    clearInterval(interval);
    process.stdout.write('\r');
  }

  /**
   * Gradient text effect
   */
  gradientText(text, colors = ['cyan', 'blue', 'magenta']) {
    const length = text.length;
    let result = '';

    for (let i = 0; i < length; i++) {
      const colorIndex = Math.floor((i / length) * colors.length);
      const color = this.colors[colors[colorIndex]] || this.colors.primary;
      result += color(text[i]);
    }

    return result;
  }

  /**
   * Clear terminal và hiển thị header
   */
  clearAndShowHeader() {
    console.clear();
    this.showHeader();
  }

  /**
   * Header đẹp với thông tin bot - Enhanced version
   */
  showHeader() {
    const width = 70;
    const line = '═'.repeat(width);

    console.log();
    console.log(this.colors.gradient.start('╔' + line + '╗'));
    console.log(this.colors.gradient.start('║') + this.rainbowText('    🏆 ALPHABOT - WAR EDITION 🏆    ', width) + this.colors.gradient.start('║'));
    console.log(this.colors.gradient.mid('║') + this.centerText('⚡ Termux Optimized & Enhanced ⚡', width) + this.colors.gradient.mid('║'));
    console.log(this.colors.gradient.end('║') + this.centerText('💎 Premium War Bot System 💎', width) + this.colors.gradient.end('║'));
    console.log(this.colors.primary('╠' + line + '╣'));
    console.log(this.colors.primary('║') + this.centerText('🔥 Developer: NhatCoder 🔥', width) + this.colors.primary('║'));
    console.log(this.colors.primary('║') + this.centerText('⭐ Version: 2.0.0 Termux Edition ⭐', width) + this.colors.primary('║'));
    console.log(this.colors.primary('╠' + line + '╣'));
    console.log(this.colors.primary('║') + this.centerText('Developer: NhatCoder', width) + this.colors.primary('║'));
    console.log(this.colors.primary('║') + this.centerText('Version: 2.0.0 Termux', width) + this.colors.primary('║'));
    console.log(this.colors.primary('╚' + line + '╝'));
    console.log();
  }

  /**
   * Căn giữa text - Enhanced version with color support
   */
  centerText(text, width, addPadding = true) {
    // Remove ANSI color codes to calculate actual text length
    const cleanText = text.replace(/\u001b\[[0-9;]*m/g, '');
    const textLength = cleanText.length;

    if (!addPadding) return text;

    const padding = Math.max(0, width - textLength);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  /**
   * Loading animation
   */
  showLoading(text) {
    process.stdout.write(this.colors.info(`${this.symbols.loading} ${text}...`));
  }

  /**
   * Success message
   */
  showSuccess(text) {
    console.log(this.colors.success(`${this.symbols.success} ${text}`));
  }

  /**
   * Error message
   */
  showError(text) {
    console.log(this.colors.error(`${this.symbols.error} ${text}`));
  }

  /**
   * Warning message
   */
  showWarning(text) {
    console.log(this.colors.warning(`${this.symbols.warning} ${text}`));
  }

  /**
   * Info message
   */
  showInfo(text) {
    console.log(this.colors.info(`${this.symbols.info} ${text}`));
  }

  /**
   * Hiển thị thống kê bot - Enhanced version
   */
  showStats(stats) {
    const width = 65;
    console.log(this.colors.gradient.start('┌─── 🚀 BOT STATUS & ANALYTICS 🚀 ───────────────────────┐'));
    console.log(this.colors.primary('│') + ` ${this.symbols.bot} Bot ID: ${this.colors.accent(stats.botID || 'Initializing...')}`);
    console.log(this.colors.primary('│') + ` ${this.symbols.lightning} Commands: ${this.colors.success(stats.commands || '0')} ${this.colors.muted('modules loaded')}`);
    console.log(this.colors.primary('│') + ` ${this.symbols.gear} Events: ${this.colors.success(stats.events || '0')} ${this.colors.muted('handlers active')}`);
    console.log(this.colors.primary('│') + ` ${this.symbols.fire} Status: ${this.colors.success('Online & Ready')} ${this.symbols.check}`);
    console.log(this.colors.primary('│') + ` ${this.symbols.shield} Security: ${this.colors.success('Protected')} ${this.symbols.lock}`);
    console.log(this.colors.primary('│') + ` ${this.symbols.diamond} Performance: ${this.colors.success('Optimized')} ${this.symbols.star}`);
    console.log(this.colors.gradient.end('└─────────────────────────────────────────────────────────┘'));
    console.log();
  }

  /**
   * Hiển thị cấu trúc thư mục core - Enhanced
   */
  showCoreStructure() {
    console.log(this.colors.highlight(`${this.symbols.gear} 📁 CORE ARCHITECTURE:`));
    console.log(this.colors.success('├── 🏗️  System/'));
    console.log(this.colors.info('│   ├── ⚙️  core/          ') + this.colors.muted('# Core system engine'));
    console.log(this.colors.info('│   ├── 💬 FCA/           ') + this.colors.muted('# Facebook Chat API'));
    console.log(this.colors.info('│   └── 🔧 Handlers/      ') + this.colors.muted('# Event & Data handlers'));
    console.log(this.colors.warning('├── 📜 Scripts/'));
    console.log(this.colors.info('│   ├── ⚡ commands/      ') + this.colors.muted('# War & Admin commands'));
    console.log(this.colors.info('│   ├── 🎯 events/        ') + this.colors.muted('# Bot event listeners'));
    console.log(this.colors.info('│   └── 🔮 customs/       ') + this.colors.muted('# Custom extensions'));
    console.log(this.colors.primary('└── ⚙️  config/          ') + this.colors.muted('# Bot configuration'));
    console.log();
  }

  /**
   * Enhanced progress bar with gradient effects
   */
  showProgress(current, total, text = '') {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 40);
    const empty = 40 - filled;

    // Gradient progress bar
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    const gradientBar = this.gradientText(filledBar, ['green', 'cyan', 'blue']);

    const spinner = this.animations.pulse[Math.floor(Date.now() / 200) % this.animations.pulse.length];

    process.stdout.write(`\r${this.colors.info(spinner)} ${text} [${gradientBar}${this.colors.muted(emptyBar)}] ${this.colors.accent(percentage + '%')}`);

    if (current === total) {
      process.stdout.write(`\r${this.colors.success(this.symbols.success)} ${text} [${gradientBar}${this.colors.muted(emptyBar)}] ${this.colors.success('100%')}\n`);
    }
  }

  /**
   * Fancy loading animation
   */
  showFancyLoading(text, duration = 2000) {
    return new Promise((resolve) => {
      const frames = this.animations.loading;
      let frameIndex = 0;

      const interval = setInterval(() => {
        const spinner = this.colors.info(frames[frameIndex]);
        const dots = '.'.repeat((frameIndex % 3) + 1);
        process.stdout.write(`\r${spinner} ${text}${dots}   `);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        process.stdout.write(`\r${this.colors.success(this.symbols.success)} ${text}\n`);
        resolve();
      }, duration);
    });
  }

  /**
   * Separator đẹp
   */
  showSeparator() {
    console.log(this.colors.muted('─'.repeat(60)));
  }

  /**
   * Enhanced footer với animation
   */
  showFooter() {
    const width = 70;
    console.log(this.colors.gradient.start('─'.repeat(width)));
    console.log(this.rainbowText(`🚀 Bot is running... Press Ctrl+C to stop 🚀`, width));
    console.log(this.colors.muted(this.centerText('© 2025 NhatCoder - AlphaBot Premium Edition', width)));
    console.log(this.colors.gradient.end('─'.repeat(width)));
  }

  /**
   * Show system status with real-time info
   */
  showSystemStatus() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    console.log(this.colors.highlight(`${this.symbols.gear} SYSTEM STATUS:`));
    console.log(this.colors.info(`${this.symbols.lightning} Memory: ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB Heap`));
    console.log(this.colors.info(`${this.symbols.rocket} Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`));
    console.log(this.colors.info(`${this.symbols.diamond} Node.js: ${process.version}`));
    console.log(this.colors.info(`${this.symbols.star} Platform: ${process.platform} (${process.arch})`));
    console.log();
  }

  /**
   * Enhanced banner for special events
   */
  showSpecialBanner(title, subtitle = '') {
    const width = 80;
    const line = '═'.repeat(width);

    console.log();
    console.log(this.colors.success('╔' + line + '╗'));
    console.log(this.colors.success('║') + this.rainbowText(title, width) + this.colors.success('║'));
    if (subtitle) {
      console.log(this.colors.success('║') + this.centerText(subtitle, width) + this.colors.success('║'));
    }
    console.log(this.colors.success('╚' + line + '╝'));
    console.log();
  }
}

export default new TerminalUI();
