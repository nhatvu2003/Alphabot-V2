/**
 * Test Help Command
 * Kiểm tra lệnh help có lấy được danh sách lệnh không
 */

import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

// Mock global objects
global.plugins = {
  commandsConfig: new Map(),
  commandsAliases: new Map(),
  commands: new Map()
};

global.config = {
  LANGUAGE: 'vi_VN',
  PREFIX: '!',
  ABSOLUTES: []
};

// Add some test commands to the config map
const testCommands = [
  {
    name: 'ping',
    category: 'General',
    permissions: [0, 1, 2],
    description: 'Test ping command',
    aliases: ['p']
  },
  {
    name: 'help',
    category: 'Admin', 
    permissions: [2],
    description: 'Show help',
    aliases: ['h', 'cmd']
  },
  {
    name: 'ban',
    category: 'Moderation',
    permissions: [1, 2],
    description: 'Ban user',
    aliases: []
  }
];

// Populate test data
testCommands.forEach(cmd => {
  global.plugins.commandsConfig.set(cmd.name, cmd);
  if (cmd.aliases.length > 0) {
    global.plugins.commandsAliases.set(cmd.name, cmd.aliases);
  }
});

console.log('🧪 Testing Help Command');
console.log('='.repeat(50));

// Test 1: Check if commandsConfig is populated
console.log('📋 Commands in global.plugins.commandsConfig:');
for (const [name, config] of global.plugins.commandsConfig.entries()) {
  console.log(`  - ${name}: ${config.description} (${config.category})`);
}

// Test 2: Test permission function
function checkCommandPermissions(requiredPermissions, userPermissions) {
  const permissionLevels = [];
  
  if (userPermissions.includes('user')) permissionLevels.push(0);
  if (userPermissions.includes('mod') || userPermissions.includes('thread_admin')) permissionLevels.push(1);
  if (userPermissions.includes('admin') || userPermissions.includes('supper_admin')) permissionLevels.push(2);
  
  return requiredPermissions.some(reqPerm => permissionLevels.includes(reqPerm));
}

// Test different user permission levels
const testUsers = [
  { name: 'Regular User', permissions: ['user'] },
  { name: 'Moderator', permissions: ['user', 'mod'] },
  { name: 'Admin', permissions: ['user', 'mod', 'admin'] }
];

console.log('\n🔐 Testing Permission Checks:');
testUsers.forEach(user => {
  console.log(`\n👤 ${user.name} (${user.permissions.join(', ')}):`, );
  
  testCommands.forEach(cmd => {
    const hasAccess = checkCommandPermissions(cmd.permissions, user.permissions);
    console.log(`  ${hasAccess ? '✅' : '❌'} ${cmd.name} (requires: [${cmd.permissions.join(', ')}])`);
  });
});

// Test 3: Simulate help command logic
console.log('\n📝 Testing Help Command Logic:');

function testHelpCommand(userPermissions) {
  let commands = {};
  const language = 'vi_VN';
  
  for (const [key, value] of global.plugins.commandsConfig.entries()) {
    if (!!value.isHidden) continue;
    if (!value.hasOwnProperty("permissions")) value.permissions = [0, 1, 2];
    
    const hasPermission = checkCommandPermissions(value.permissions, userPermissions);
    if (!hasPermission) continue;
    
    if (!commands.hasOwnProperty(value.category)) commands[value.category] = [];
    commands[value.category].push(value._name && value._name[language] ? value._name[language] : key);
  }

  return commands;
}

testUsers.forEach(user => {
  console.log(`\n👤 ${user.name} would see:`);
  const commands = testHelpCommand(user.permissions);
  
  for (const [category, cmdList] of Object.entries(commands)) {
    console.log(`  📁 ${category}: ${cmdList.join(', ')}`);
  }
  
  const total = Object.values(commands).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`  📊 Total: ${total} commands`);
});

console.log('\n✅ Test completed!');
console.log('💡 Nếu help command vẫn không hoạt động, kiểm tra:');
console.log('   1. global.plugins.commandsConfig có được khởi tạo đúng không?');
console.log('   2. Quyền user có được truyền đúng không?');
console.log('   3. Các command có đúng cấu trúc config không?');