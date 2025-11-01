import {
  join,
  resolve as resolvePath
} from 'path';
import {
  readFileSync,
  writeFileSync,
  existsSync
} from 'fs';

const pathAutorep = join(resolvePath(process.cwd(), 'data', 'user-data', 'Data', 'autorep.json'));
function onLoad() {
  if (!existsSync(pathAutorep)) {
    writeFileSync(pathAutorep, JSON.stringify({}));
  }
  if (!global.autorep) {
    global.autorep = new Map();
  }
}
const config = {
  name: "Autorep",
  version: "1.0.0",
  credits: "Nhật Ngáo",

}
function Running({
  message, extra, args
}) {
  const caurep = JSON.parse(readFileSync(resolvePath(global.NVCODER.Lyrics, "autorep.json")));
  if (message.senderID == global.botID) return;
  let data = JSON.parse(readFileSync(pathAutorep, 'utf-8'));
  if (!data[message.threadID] || !data[message.threadID].enable) return;
  const TIME_WAIT = 2000;
  const time_wait = global.autorep.get(message.threadID) || 0;
  if (Date.now() - time_wait < TIME_WAIT || message.args[1] === 'stop') {
    return;
  }
  global.autorep.set(message.threadID, Date.now());
  if ((data[message.threadID].mention != '' && data[message.threadID].mention == message.senderID && message.isGroup) || !message.isGroup) {
    if (data[message.threadID].index >= caurep.length) data[message.threadID].index = 0;
    message.send({
      body: caurep[data[message.threadID].index].replace(/{name}/g, data[message.threadID].content), mentions: [{
        id: data[message.threadID].mention,
        tag: data[message.threadID].content
      }]

    });
    data[message.threadID].index++;
    writeFileSync(pathAutorep, JSON.stringify(data, null, 4), 'utf-8');
  }
}
export default {
  config,
  Running,
  onLoad
}
