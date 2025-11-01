import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const code = require('./code.cjs');
export default code;
