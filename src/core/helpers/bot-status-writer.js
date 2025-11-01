/**
 * Bot Status Writer
 * Writes bot status to file for dashboard communication
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve as resolvePath } from 'path';

class BotStatusWriter {
  constructor() {
    this.statusPath = resolvePath(process.cwd(), 'data', 'bot-status.json');
    this.dataDir = resolvePath(process.cwd(), 'data');

    // Ensure data directory exists
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    this.startTime = Date.now();
    this.lastUpdate = Date.now();

    // Update status every 5 seconds
    this.updateInterval = setInterval(() => {
      this.updateStatus();
    }, 5000);
  }

  updateStatus() {
    try {
      const status = {
        botID: global.botID || 'Unknown',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        commands: global.plugins?.commands?.size || 0,
        events: global.plugins?.events?.size || 0,
        onMessage: global.plugins?.onMessage?.size || 0,
        online: true,
        lastUpdate: Date.now(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      };

      writeFileSync(this.statusPath, JSON.stringify(status, null, 2));
      this.lastUpdate = Date.now();
    } catch (error) {
      console.error('[STATUS WRITER] Error updating status:', error);
    }
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export default BotStatusWriter;
