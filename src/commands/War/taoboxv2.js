const config = {
  name: "taoboxv2",
  aliases: ["rb2",
    "regbox2"],
  description: "Tạo box",
  usage: "[SL] [tag]",
  cooldown: 3,
  permissions: [2],
  credits: "Nhật Ngáo"
}

if (!global.taobox) global.taobox = new Set();

const DELAY = 450;

async function Running( {
  message, args
}) {
  //if (message.senderID != global.botID) return;
  // if (message.isGroup) return;
  const {
    mentions
  } = message;
  const mentionId = Object.keys(mentions)[0];
  const mentionName = mentions[mentionId];
  let isStop = args[0]?.toLowerCase() == "stop";
  message.send({
    body: 'Chết mẹ mày rồi con chó '+mentionName+' ạ', mentions: [{
      id: mentionId, tag: mentionName
    }]
  })
  const groupMember = [message.senderID,
    global.botID];
  console.log(groupMember);
  if (isStop) {
    global.taobox.delete(message.threadID);

    return;
  }

  let amount = parseInt(args[0]) || 1;
  //let boxname = args[1] ?? null;

  const groupMembers = [mentionId,
    global.botID];
  global.taobox.add(message.threadID);

  for (let i = 0; i < amount; i++) {
    //if (!global.taobox.has(message.threadID)) return;

    const newThreadID = await global.api.createNewGroup(groupMembers, global.config.GBOTWAR_MESSAGE.notiAutoRegBox);
    global.api.sendMessage(global.config.GBOTWAR_MESSAGE.notiAutoRegBox, newThreadID);

    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
}

export default {
  config,
  Running
}