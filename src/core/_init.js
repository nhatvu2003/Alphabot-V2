import { readdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';

import _init_global from './_global_info.js';
import common from './common.js';

function _load_global() {
  return _init_global();
}

async function _get_modules() {
  try {
    const dirModules = readdirSync(resolvePath(global.CorePath, 'core', 'helpers')).filter(file => file.endsWith('.js'));

    for (const module of dirModules) {
      const modulePath = resolvePath(global.CorePath, 'core', 'helpers', module);
      const moduleURL = pathToFileURL(modulePath);
      const moduleExport = await import(moduleURL);

      global.modules.set(module.slice(0, -3), moduleExport.default);
    }
  } catch (error) {
    throw error;
  }
}

function _load_common() {
  for (const [key, value] of Object.entries(common)) {
    global[key] = value;
  }
}

function _load_config() {
  const loadedConfig = global.modules.get('loader').loadConfig();

  // Force set global.config và lock nó
  global.config = loadedConfig;

  // Thêm log để track khi nào config bị thay đổi
  Object.defineProperty(global, 'config', {
    value: loadedConfig,
    writable: true,
    enumerable: true,
    configurable: true
  });
} function _load_lang() {
  global.data.langSystem = global.modules.get('loader').loadLang();
  global.getLang = global.modules.get('loader').getLang;
}

function _load_plugins() {
  return global.modules.get('loader').loadPlugins();
}

async function _init_var() {
  try {
    await _load_global();

    await _get_modules();

    _load_common();
    _load_config();
    _load_lang();

    await _load_plugins();
  } catch (error) {
    throw error;
  }
}


export default _init_var;
