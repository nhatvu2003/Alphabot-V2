import {
  resolve as resolvePath
} from 'path';
import {
  readFileSync,
  writeFileSync
} from 'fs';

const config = {
  name: "spamv2",
  version: "2.0.0",
  aliases: [
    'spv2',
    'spam2',
    'sp2'],
  descriptions: "Spam theo list có sẵn bay cặc mấy đứa xàm lồn 🙂",
  credits: "Nhật Ngáo",
  permissions: [2],
  extra: {
    "time": 2000//time mặc định spam không nên thay đổi nếu đéo muốn bị khóa mõm
  }
}
if (!global.Spamv2) {
  global.Spamv2 = [];
}
async function Running( {
  message, args, extra
}) {

  const FileCache = readFileSync(resolvePath(global.NVCODER.Lyrics, "spam.txt"));
  let select = args[0]?.toLowerCase();
  let contentAdd = args.slice(1);
  switch (select) {
    case 'add':
      const content = contentAdd.join(" ");
      writeFileSync(resolvePath(global.NVCODER.Lyrics, "spam.txt"),content,"utf-8");
      message.reply("Thêm mẫu spam thành công");
      break;
    case 'stop':
      const isStop = args[0]?.toLowerCase() === 'stop';
      //if (isStop) {
      const stopper = global.Spamv2.indexOf(message.threadID);
      if (stopper > -1) {
        global.Spamv2.splice(stopper, 1);
        return message.reply(global.config.GBOTWAR_MESSAGE.SPAM_STOP);
      } else {
        return message.reply('Mày có spam đéo đâu mà dừng ?');
      }

      break;
    default:
      if (FileCache.length === 0) {
        message.reply('Mày đã thêm mẫu spam đéo đâu ?');
      }
      if (global.Spamv2.indexOf(message.threadID) > -1) {
        return message.reply('Mày muốn bị khóa mõm à ?Thứ óc lồn này!')
      } else {
        global.Spamv2.push(message.threadID);
        while (global.Spamv2.indexOf(message.threadID) > -1) {
          message.send(FileCache.toString()).catch(e => {
            console.error(e)
          });
          await new Promise(resolve => {
            setTimeout(resolve, extra.time)
          })
        }
      }

    }
  }
  export default {
    config,
    Running
  }