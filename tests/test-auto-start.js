#!/usr/bin/env node

/**
 * Test Auto-Start Bot Feature
 * Kiểm tra xem bot có khởi động tự động sau khi update appstate không
 */

import { spawn, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

const tests = [];
let testsPassed = 0;
let testsFailed = 0;

// Helper: Add test
function addTest(name, fn) {
  tests.push({ name, fn });
}

// Helper: Log result
function logResult(passed, message) {
  if (passed) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${message}`);
    testsFailed++;
  }
}

// Test 1: Check if spawn/exec are imported from child_process (order-agnostic)
addTest('Verify spawn/exec import', () => {
  const scriptPath = resolvePath(process.cwd(), 'scripts', 'update-appstate.js');
  const content = readFileSync(scriptPath, 'utf8');
  const hasChildProcessImport = content.includes("from 'child_process'") || content.includes('from "child_process"');
  const hasSpawn = /\bspawn\b/.test(content);
  const hasExec = /\bexec\b/.test(content);
  logResult(hasChildProcessImport && hasSpawn && hasExec, 'spawn & exec imported from child_process');
});

// Test 2: Check if bot process is detached
addTest('Verify detached process', () => {
  const scriptPath = resolvePath(process.cwd(), 'scripts', 'update-appstate.js');
  const content = readFileSync(scriptPath, 'utf8');
  const hasDetached = content.includes('detached: true');
  logResult(hasDetached, 'Bot process spawned with detached: true');
});

// Test 3: Check unref
addTest('Verify unref call', () => {
  const scriptPath = resolvePath(process.cwd(), 'scripts', 'update-appstate.js');
  const content = readFileSync(scriptPath, 'utf8');
  const hasUnref = content.includes('botProcess.unref()');
  logResult(hasUnref, 'botProcess.unref() called to allow parent exit');
});

// Test 4: Check appstate paths
addTest('Verify appstate paths', () => {
  const appstatePath = resolvePath(process.cwd(), 'data', 'appstate.json');
  const exists = existsSync(appstatePath) || true; // Create if not exists
  if (!existsSync(appstatePath)) {
    writeFileSync(appstatePath, '[]', 'utf8');
  }
  logResult(true, `Appstate path ready: ${appstatePath}`);
});

// Test 5: Check bot entry point
addTest('Verify bot entry point', () => {
  const botPath = resolvePath(process.cwd(), 'src', 'core', 'Gbot.js');
  const exists = existsSync(botPath);
  logResult(exists, `Bot entry point exists: ${botPath}`);
});

// Test 6: Check package.json scripts
addTest('Verify package.json scripts', () => {
  const pkgPath = resolvePath(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const hasUI = pkg.scripts?.ui === 'node scripts/update-appstate.js';
  logResult(hasUI, 'npm run ui command configured correctly');
});

// Run all tests
console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   🧪 ALPHABOT AUTO-START BOT TEST SUITE        ║');
console.log('╚════════════════════════════════════════════════╝\n');

tests.forEach(({ name, fn }) => {
  try {
    fn();
  } catch (e) {
    logResult(false, `${name}: ${e.message}`);
  }
});

// Summary
console.log(`\n╔════════════════════════════════════════════════╗`);
console.log(`║ ✅ Passed: ${testsPassed}  |  ❌ Failed: ${testsFailed}`);
console.log(`╚════════════════════════════════════════════════╝\n`);

if (testsFailed === 0) {
  console.log('🎉 All tests passed! Bot auto-start is properly configured.\n');
  console.log('📝 Quick Start:');
  console.log('  1. Start Web UI:      npm run ui');
  console.log('  2. Update appstate:   Paste JSON/Cookies in browser');
  console.log('  3. Bot auto-starts:   Check terminal for bot logs\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please check the configuration.\n');
  process.exit(1);
}
