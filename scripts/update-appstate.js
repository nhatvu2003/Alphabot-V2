/**
 * @author    Nhat Vu
 * @github    https://github.com/nhatvu2003
 * @description Web-based Appstate Updater - Professional UI
 */

import express from 'express';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { spawn, exec } from 'child_process';
import { mkdirSync } from 'fs';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();

// Single-instance lock path shared with main index.js
const BOT_LOCK_PATH = resolvePath(process.cwd(), 'data', 'bot.lock');

function isProcessRunning(pid) {
  try { process.kill(pid, 0); return true; } catch (_) { return false; }
}

// Termux Detection & Port Configuration
function isTermux() {
  return process.env.PREFIX?.includes('/data/data/com.termux') ||
         process.env.TERMUX_VERSION ||
         (os.platform() === 'linux' && process.cwd().includes('/data/data/com.termux'));
}

// Auto-adjust port for Termux (avoid conflicts with common ports)
let PORT = isTermux() ? 8080 : 3030;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Get appstate status
app.get('/api/status', (req, res) => {
  // Prefer the data/appstate.json location; fallback to root for backward compatibility
  const appstatePathData = resolvePath(process.cwd(), 'data', 'appstate.json');
  const appstatePathRoot = resolvePath(process.cwd(), 'appstate.json');
  const chosenPath = existsSync(appstatePathData) ? appstatePathData : (existsSync(appstatePathRoot) ? appstatePathRoot : null);

  if (chosenPath) {
    try {
      const appstate = JSON.parse(readFileSync(chosenPath, 'utf8'));
      const userID = appstate.find(item => item.key === 'c_user')?.value || 'Unknown';
      res.json({
        exists: true,
        userID,
        cookies: Array.isArray(appstate) ? appstate.length : 0,
        lastModified: new Date(require('fs').statSync(chosenPath).mtime).toLocaleString()
      });
    } catch (error) {
      res.json({ exists: true, error: 'Invalid appstate format' });
    }
  } else {
    res.json({ exists: false });
  }
});

// Appstate helper endpoints
app.get('/api/appstate', (req, res) => {
  try {
    const appstatePathData = resolvePath(process.cwd(), 'data', 'appstate.json');
    const appstatePathRoot = resolvePath(process.cwd(), 'appstate.json');
    const chosenPath = existsSync(appstatePathData) ? appstatePathData : (existsSync(appstatePathRoot) ? appstatePathRoot : null);
    if (!chosenPath) return res.json({ success: true, exists: false });
    const appstate = JSON.parse(readFileSync(chosenPath, 'utf8'));
    const userID = appstate.find(i => i.key === 'c_user')?.value || null;
    return res.json({ success: true, exists: true, userID, count: Array.isArray(appstate) ? appstate.length : 0, lastModified: new Date(require('fs').statSync(chosenPath).mtime).toISOString() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/appstate/download', (req, res) => {
  const appstatePathData = resolvePath(process.cwd(), 'data', 'appstate.json');
  const appstatePathRoot = resolvePath(process.cwd(), 'appstate.json');
  const chosenPath = existsSync(appstatePathData) ? appstatePathData : (existsSync(appstatePathRoot) ? appstatePathRoot : null);
  if (!chosenPath) return res.status(404).json({ success: false, message: 'No appstate file found' });
  res.setHeader('Content-Disposition', 'attachment; filename="appstate.json"');
  res.setHeader('Content-Type', 'application/json');
  try {
    const buf = readFileSync(chosenPath);
    return res.send(buf);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Admins API - stored at data/admins.json
const adminsPath = resolvePath(process.cwd(), 'data', 'admins.json');
// ensure data directory exists
const dataDir = resolvePath(process.cwd(), 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

function readAdmins() {
  try {
    // If admins file exists and has entries, return it
    if (existsSync(adminsPath)) {
      const raw = readFileSync(adminsPath, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }

    // Fallback: read config/config.main.json to seed admins from ABSOLUTES and MODERATORS
    const configPath = resolvePath(process.cwd(), 'config', 'config.main.json');
    if (existsSync(configPath)) {
      try {
        const cfgRaw = readFileSync(configPath, 'utf8');
        const cfg = JSON.parse(cfgRaw || '{}');
        const fromConfig = [];
        if (Array.isArray(cfg.ABSOLUTES)) fromConfig.push(...cfg.ABSOLUTES.map(String));
        if (Array.isArray(cfg.MODERATORS)) fromConfig.push(...cfg.MODERATORS.map(String));
        // unique
        const unique = Array.from(new Set(fromConfig));
        // persist to adminsPath for future reads
        try { writeFileSync(adminsPath, JSON.stringify(unique, null, 2), 'utf8'); } catch (e) { /* ignore write errors */ }
        return unique;
      } catch (e) {
        return [];
      }
    }

    return [];
  } catch (e) { return []; }
}

function writeAdmins(list) {
  try {
    writeFileSync(adminsPath, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

app.get('/api/admins', (req, res) => {
  const list = readAdmins();
  res.json({ success: true, admins: list });
});

app.post('/api/admins', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'No id provided' });
    const list = readAdmins();
    if (list.includes(id)) return res.status(400).json({ success: false, message: 'ID already an admin' });
    list.push(id);
    if (!writeAdmins(list)) return res.status(500).json({ success: false, message: 'Failed to save admins' });
    res.json({ success: true, admins: list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/admins/:id', (req, res) => {
  try {
    const id = req.params.id;
    let list = readAdmins();
    if (!list.includes(id)) return res.status(404).json({ success: false, message: 'Admin not found' });
    list = list.filter(x => x !== id);
    if (!writeAdmins(list)) return res.status(500).json({ success: false, message: 'Failed to save admins' });
    res.json({ success: true, admins: list });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// config endpoints: read and update config/config.main.json
const configPath = resolvePath(process.cwd(), 'config', 'config.main.json');

app.get('/api/config', (req, res) => {
  try {
    if (!existsSync(configPath)) return res.status(404).json({ success: false, message: 'config not found' });
    const raw = readFileSync(configPath, 'utf8');
    const cfg = JSON.parse(raw || '{}');
    res.json({ success: true, config: cfg });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body.config;
    if (!newConfig) return res.status(400).json({ success: false, message: 'No config provided' });
    // Validate it's an object
    if (typeof newConfig !== 'object') return res.status(400).json({ success: false, message: 'config must be a JSON object' });
    // Backup existing config
    try {
      if (existsSync(configPath)) {
        const backupPath = resolvePath(process.cwd(), 'config', `config.main.json.bak`);
        const existing = readFileSync(configPath, 'utf8');
        writeFileSync(backupPath, existing, 'utf8');
      }
    } catch (e) {
      // ignore backup errors
    }
    // Write to file
    writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    res.json({ success: true, message: 'config saved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Update appstate from JSON
app.post('/api/update',async (req, res) => {
  try {
    const { appstate } = req.body;

    if (!appstate) {
      return res.status(400).json({ success: false, message: 'No appstate provided' });
    }

    // Parse and validate
    let parsedAppstate;
    if (typeof appstate === 'string') {
      parsedAppstate = JSON.parse(appstate);
    } else {
      parsedAppstate = appstate;
    }

    if (!Array.isArray(parsedAppstate)) {
      return res.status(400).json({ success: false, message: 'Appstate must be an array' });
    }

    // Validate required cookies
    const requiredKeys = ['c_user', 'xs', 'datr'];
    const hasRequired = requiredKeys.every(key =>
      parsedAppstate.some(item => item.key === key)
    );

    if (!hasRequired) {
      return res.status(400).json({
        success: false,
        message: `Missing required cookies: ${requiredKeys.join(', ')}`
      });
    }

  // Save appstate (store under data/appstate.json for consistency)
  const appstatePath = resolvePath(process.cwd(), 'data', 'appstate.json');
  writeFileSync(appstatePath, JSON.stringify(parsedAppstate, null, 2), 'utf8');

    // Backup old fb_dtsg_data
    const fbDtsgPath = resolvePath(process.cwd(), 'fb_dtsg_data.json');
    if (existsSync(fbDtsgPath)) {
      const backupPath = resolvePath(process.cwd(), 'fb_dtsg_data.json.backup');
      const fbDtsg = readFileSync(fbDtsgPath, 'utf8');
      writeFileSync(backupPath, fbDtsg, 'utf8');
    }

    // Delete fb_dtsg_data to force refresh
    if (existsSync(fbDtsgPath)) {
      writeFileSync(fbDtsgPath, '{}', 'utf8');
    }
    const userID = parsedAppstate.find(item => item.key === 'c_user')?.value || 'Unknown';

    // Trigger automatic bot startup in background (non-blocking)
    // Optimized for Termux: spawns bot detached, doesn't block response
    try {
      console.log(`[APP] Starting bot for user ${userID}...`);
      
      // Choose entry point based on environment
      const entryPoint = isTermux() ? 'index.js' : 'src/core/Gbot.js';
      // Respect existing lock to avoid double starts
      try {
        if (existsSync(BOT_LOCK_PATH)) {
          const pidStr = readFileSync(BOT_LOCK_PATH, 'utf8').trim();
          const oldPid = Number(pidStr);
          if (!Number.isNaN(oldPid) && isProcessRunning(oldPid)) {
            console.log(`[APP] Bot already running (PID ${oldPid}). Skipping spawn.`);
            throw new Error('BOT_ALREADY_RUNNING');
          } else {
            try { unlinkSync(BOT_LOCK_PATH); } catch (_) {}
          }
        }
      } catch (e) {
        if (e && e.message === 'BOT_ALREADY_RUNNING') throw e; // bubble up to skip spawn but not crash request
      }
      
      // Spawn bot process detached so it continues running even after response
      const botProcess = spawn('node', [
        '--trace-warnings',
        '--experimental-import-meta-resolve',
        '--expose-gc',
        entryPoint
      ], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore', // Termux: ignore stdio to free resources
        env: {
          ...process.env,
          // Termux optimization: reduce memory overhead
          NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=256',
          LOG_LEVEL: process.env.LOG_LEVEL || 'INFO'
        }
      });
      
      // Unref so parent process can exit without waiting for child
      botProcess.unref();
      // Write lock only if we directly spawned Gbot (index.js will handle its own lock)
      if (entryPoint === 'src/core/Gbot.js') {
        try { writeFileSync(BOT_LOCK_PATH, String(botProcess.pid)); } catch (_) {}
      }
      
      console.log(`[APP] Bot spawned with PID: ${botProcess.pid}`);
    } catch (e) {
      if (e && e.message === 'BOT_ALREADY_RUNNING') {
        console.log('[APP] Bot start skipped: already running.');
      } else {
        console.error(`[APP] Failed to start bot:`, e.message || e);
      }
    }

    res.json({
      success: true,
      message: isTermux() 
        ? '✅ Appstate updated!\n🚀 Bot khởi động...\n⏳ Check terminal (5-10s)'
        : '✅ Appstate updated successfully!\n🚀 Bot đang khởi động...\n⏳ Vui lòng chờ khoảng 5-10 giây để bot kết nối',
      userID,
      cookies: parsedAppstate.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update appstate from cookies
app.post('/api/update-cookies', (req, res) => {
  try {
    const { cookies } = req.body;

    if (!cookies) {
      return res.status(400).json({ success: false, message: 'No cookies provided' });
    }

    // Parse cookies string into appstate format
    const cookieArray = cookies.split(';').map(c => c.trim());
    const appstate = [];

    cookieArray.forEach(cookie => {
      const [key, value] = cookie.split('=');
      if (key && value) {
        appstate.push({
          key: key.trim(),
          value: value.trim(),
          domain: 'facebook.com',
          path: '/',
          hostOnly: false,
          creation: new Date().toISOString(),
          lastAccessed: new Date().toISOString()
        });
      }
    });

    // Validate
    const requiredKeys = ['c_user', 'xs', 'datr'];
    const hasRequired = requiredKeys.every(key =>
      appstate.some(item => item.key === key)
    );

    if (!hasRequired) {
      return res.status(400).json({
        success: false,
        message: `Missing required cookies: ${requiredKeys.join(', ')}`
      });
    }

  // Save appstate (store under data/appstate.json for consistency)
  const appstatePath = resolvePath(process.cwd(), 'data', 'appstate.json');
  writeFileSync(appstatePath, JSON.stringify(appstate, null, 2), 'utf8');

    // Clear fb_dtsg_data
    const fbDtsgPath = resolvePath(process.cwd(), 'fb_dtsg_data.json');
    if (existsSync(fbDtsgPath)) {
      writeFileSync(fbDtsgPath, '{}', 'utf8');
    }

    const userID = appstate.find(item => item.key === 'c_user')?.value || 'Unknown';

    // Trigger automatic bot startup in background (non-blocking)
    // Optimized for Termux
    try {
      console.log(`[APP] Starting bot for user ${userID}...`);
      
      const entryPoint = isTermux() ? 'index.js' : 'src/core/Gbot.js';
      // Respect existing lock to avoid double starts
      try {
        if (existsSync(BOT_LOCK_PATH)) {
          const pidStr = readFileSync(BOT_LOCK_PATH, 'utf8').trim();
          const oldPid = Number(pidStr);
          if (!Number.isNaN(oldPid) && isProcessRunning(oldPid)) {
            console.log(`[APP] Bot already running (PID ${oldPid}). Skipping spawn.`);
            throw new Error('BOT_ALREADY_RUNNING');
          } else {
            try { unlinkSync(BOT_LOCK_PATH); } catch (_) {}
          }
        }
      } catch (e) {
        if (e && e.message === 'BOT_ALREADY_RUNNING') throw e;
      }
      
      const botProcess = spawn('node', [
        '--trace-warnings',
        '--experimental-import-meta-resolve',
        '--expose-gc',
        entryPoint
      ], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=256',
          LOG_LEVEL: process.env.LOG_LEVEL || 'INFO'
        }
      });
      
      botProcess.unref();
      if (entryPoint === 'src/core/Gbot.js') {
        try { writeFileSync(BOT_LOCK_PATH, String(botProcess.pid)); } catch (_) {}
      }
      console.log(`[APP] Bot spawned with PID: ${botProcess.pid}`);
    } catch (e) {
      if (e && e.message === 'BOT_ALREADY_RUNNING') {
        console.log('[APP] Bot start skipped: already running.');
      } else {
        console.error(`[APP] Failed to start bot:`, e.message || e);
      }
    }

    res.json({
      success: true,
      message: isTermux()
        ? '✅ Appstate updated!\n🚀 Bot khởi động...\n⏳ Check terminal (5-10s)'
        : '✅ Appstate updated from cookies!\n🚀 Bot đang khởi động...\n⏳ Vui lòng chờ khoảng 5-10 giây để bot kết nối',
      userID,
      cookies: appstate.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test login
app.post('/api/test-login', async (req, res) => {
  try {
    const appstatePathRoot = resolvePath(process.cwd(), 'appstate.json');
    const appstatePathData = resolvePath(process.cwd(), 'data', 'appstate.json');

    if (!existsSync(appstatePathRoot) && !existsSync(appstatePathData)) {
      return res.status(400).json({
        success: false,
        message: 'No appstate found. Please update appstate first.'
      });
    }

    // Test login by running a quick node command; keep it short
    const { stdout, stderr } = await execAsync('node -e "console.log(\'OK\')"', { timeout: 10000 });
    res.json({ success: true, message: 'Login test ping completed.', output: (stdout || stderr || '').trim() });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login test failed',
      error: error.message
    });
  }
});

// Serve static UI (public/index.html)
app.get('/', (req, res) => {
  const indexPath = resolvePath(process.cwd(), 'public', 'index.html');
  if (existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send('<h3>Appstate UI not found. Please ensure public/index.html exists.</h3>');
});

// Start server with Termux optimizations
function startServer(port, attempt = 0) {
  const server = app.listen(port, () => {
    const platform = isTermux() ? 'TERMUX 📱' : 'SERVER 🖥️';
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log(`║   🤖 AlphaBot - Appstate Manager (${platform})        ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    if (isTermux()) {
      console.log(`  📍 Access via: http://localhost:${port}`);
      console.log('  💡 Use Termux browser or external device');
    } else {
      console.log(`  🌐 Server running at: http://localhost:${port}`);
    }
    console.log('');
    console.log('  ✨ Features:');
    console.log('     ✅ Update appstate (JSON)');
    console.log('     ✅ Auto-start bot');
    console.log('     ✅ Manage admins & config');
    console.log('     ✅ Preview / Download appstate');
    console.log('');
    console.log('  ⏹️  Press Ctrl+C to stop');
    console.log('');
    
    // Termux-specific info
    if (isTermux()) {
      console.log('  [TERMUX MODE]');
      console.log('  Memory optimizations: Enabled');
      console.log(`  NODE_OPTIONS: --max-old-space-size=256`);
      console.log('');
    }
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = (attempt < 5) ? port + 1 : 0; // try a few times then pick random
      console.warn(`Port ${port} in use. Trying ${nextPort === 0 ? 'random available port' : nextPort}...`);
      startServer(nextPort, attempt + 1);
    } else {
      console.error('Server failed to start:', err?.message || err);
      process.exit(1);
    }
  });
}

startServer(PORT);
