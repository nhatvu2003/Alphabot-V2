import moment from 'moment-timezone';
import handleEvents from './events.js';
import {
  handleDatabase
} from './database.js';


export default async function handleListen() {
  const {
    handleCommand,
    handleReaction,
    handleMessage,
    handleReply,
    handleUnsend,
    handleEvent
  } = await handleEvents();

  // Tối ưu cho Termux - loại bỏ các event không cần thiết
  const eventlog_excluded = ["typ", "presence", "read_receipt", "delivery_receipt", "log:subscribe", "log:unsubscribe"];
  const logger = global.modules.get('console');
  function handleEventLog(event) {
    const {
      LOG_LEVEL,
      timezone
    } = global.config;

    if (LOG_LEVEL == 0) return;
    if (eventlog_excluded.includes(event.type)) return;
    const {
      type,
      threadID,
      body,
      senderID
    } = event;
    if (global.config?.GBOTWAR_OPTIONS?.LISTEN_CONSOLE === true) {
      if (LOG_LEVEL == 1) {
        let time = moment().tz(timezone).format('YYYY-MM-DD_HH:mm:ss');

        if (type == 'message' || type == 'message_reply') {
          logger.custom(`${threadID} • ${senderID} • ${body ? body : 'Photo, video, sticker, etc.'}`, `${time}`);
        }
      } else if (LOG_LEVEL == 2) {
        console.log(event);
      }
    } else {
      logger.warn("Listen show hiện đang tắt vui lòng bật để nhìn thấy nội dung trong các cuộc trò chuyện ");
    }
    return;
  }

  return (err, event) => {
    if (global.maintain && !global.config.MODERATORS.some(e => e == event.senderID || e == event.userID)) return;
    handleEventLog(event);
    if (global.config.ALLOW_INBOX !== true && event.isGroup === false) return;
    (async () => {
      if (!eventlog_excluded.includes(event.type)) {
        await handleDatabase({
          ...event
        });
      }
      switch (event.type) {
        case "message":
        case "message_reply":
          handleMessage({
            ...event
          });
          handleReply({
            ...event
          });
          handleCommand({
            ...event
          });
          break;
        case "message_reaction":
          handleReaction({
            ...event
          });
          break;
        case "message_unsend":
          handleUnsend({
            ...event
          });
          break;
        case "event":
        case "change_thread_image":
          handleEvent({
            ...event
          });
          break;
        case "typ":
          break;
        case "presence":
          break;
        case "read_receipt":
          break;
        default:
          break;
      }
    })();
  }
}
