import axios from 'axios';
import semver from 'semver';
import cron from 'node-cron';
import {
  readFileSync
} from 'fs';
import {
  resolve as resolvePath
} from 'path'
const config = {
  name: "Auto Send Message Update",
  version: "1.0.0",
  credits: "Nhật Ngáo"
}
async function Running() {
  cron.schedule('1,5,10,15,20,25,30,35,40,45,50,55,59 * * * *', () => {
    const admin = global.config.ABSOLUTES;

    /* const update = global.GET('https://raw.githubusercontent.com/nhatcoder2003/Gbot-War/main/package.json');
    const {
      version
    } = update.data;
    const currentVersion = JSON.parse(readFileSync('../../package.json')).version;
    const nvcoder = 1;
    //if (nvcoder == 1) {
      admin.forEach(id => {
        global.api.sendMessage('Con Cặc', id)
        //global.api.sendMessage('『Đã có phiên bản mới trên hệ thống vui lòng cập nhật lên phiên bản mới nhất để chạy ổn định hơn\n•Phiên bản hiện tại: '+currentVersion+'\n•Phiên bản mới: '+version+'\nĐây là tin nhắn tự động』', id);
      });*/
    // } else {
    //const currentVersion = JSON.parse(readFileSync(resolvePath(global.mainPath, "package.json"));
    axios.get(`https://raw.githubusercontent.com/nhatcoder2003/Alphabot/main/package.json`).then((res) => {
      const currentVersion = JSON.parse(readFileSync(resolvePath(global.mainPath, "package.json"))).version;
        if (semver.lt(currentVersion, res.data.version)) {
          admin.forEach(id => {
            global.api.sendMessage('『Đã có phiên bản mới trên hệ thống vui lòng cập nhật lên phiên bản mới nhất để chạy ổn định hơn』\n━━━━━━━━━━━━━━━━\n•Phiên bản hiện tại: '+currentVersion+'\n•Phiên bản mới: '+res.data.version+'\n━━━━━━━━━━━━━━━━\nĐây là tin nhắn tự động\nVui lòng sử dụng lệnh npm run update để cập nhật lên phiên bản mới nhất', id);
          });
        }
      });
    });
  }
    export default {
      config,
      Running
    }