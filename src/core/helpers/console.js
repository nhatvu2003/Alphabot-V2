/**
* @author      Nhatcoder
* @version     1.0.0
* @homeurl     https://github.com/nhatvu2003/gbot
* @author_url     https://www.facebook.com/vuminhnhat10092003
*/
/**
* Vietnamese:
*- Vui lòng không xóa dòng này
*- Đây là động lực giúp tôi cung cấp nhưng sản miễn phí và chất lượng tới cộng đồng
*- Bất kỳ hành động sửa đổi nào sẽ ảnh hưởng tới mã nguồn hoặc dẫn tới bạn bị cấm sử dụng tiện ích dòng lệnh của alphabot
*- Bản quyền © 2023 Nhatcoder2k3
* -----------------------------------
* English:
*- Please do not delete this line
*- This is my motivation to provide free and quality products to the community
*- Any modification will affect the source code or lead to you being banned from using the alphabot command line utility
*- Copyright © 2023 Nhatcoder2k3
*/
import code from './code.js';

const logger = {
  info: (message) => {
    console.log(code.bold.hex('#1d542f').bold('[INFO]» ') + message);
  },
  warn: (message) => {
    console.log(code.bold.hex('#945f2b').bold('[WARNING]» ') + message);
  },
  error: (...args) => {
    // If any argument is an Error already logged by utils.error, skip duplicate output
    for (const a of args) {
      if (a && typeof a === 'object' && a.__alphabot_logged) return;
    }
    const message = args.map(m => {
      try {
        if (m instanceof Error) return m.message;
        if (typeof m === 'object') return JSON.stringify(m);
        return String(m);
      } catch (e) {
        return String(m);
      }
    }).join(' ');
    console.log(code.bold.hex('#942b2b').bold('[ERROR]» ') + message);
  },
  system: (message) => {
    console.log(code.bold.hex('#f59e42').bold('[SYSTEM]» ') + message);
  },
  custom: (message, type, color = "\x1b[36m") => {
    console.log(`${color}[${type}]\x1b[0m ${message}`);
  }
}
export default logger;
