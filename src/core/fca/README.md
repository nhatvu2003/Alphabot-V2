<div align="center" style="padding: 10px">

![Ws3-fca logo](20250603_215837.png)

## 🚀 ws3-fca version 2 is here!

**Disclaimer**: Use responsibly. We are not liable for account bans due to spammy activities, such as sending excessive messages, rapid logins/logouts, or sharing suspicious URLs. Be a responsible Facebook user.

</div>

## 🤔 What is the purpose of this package?
ws3-fca (so called Ws3-Facebook Chat API), is a Node.js package for automating Facebook Messenger bot. Developed by **NethWs3Dev**.

## 📖 Table of Contents
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Main Functionality](#-main-functionality)
  - [Sending Messages](#sending-messages)
  - [Saving Sessions](#saving-sessions)
  - [Listening to Chats](#listening-to-chats)
- [FAQ](#-faq)
- [Projects Using This API](#-projects-using-this-api)
- [Support](#-support)
- [License](#-license)

## ✨ Features

- **Automatic Re-login**: Detects errors and automatically re-logs in using the cookie. If the cookie is logged out, it prompts for re-submission or refreshes automatically.
- **Account Lock/Suspension Detection**: Stops the login process and displays details if an account is locked or suspended.  
  ![Lock Detection](https://i.imgur.com/Pt6oCS0.jpeg)  
  ![Suspension Info](https://i.imgur.com/R0lzR6R.jpeg)  
  ![Error Details](https://i.imgur.com/PPE3fB5.jpeg)
- **Token Refresh**: Automatically refreshes `fb_dtsg` (Facebook's dynamic token) daily at 12:00 AM (GMT+8 PH time).
- **Random User Agent**: Experimental feature to reduce logouts (`setOptions`).
- **Bypass Region**: Choose regions like PRN, PNB, HKG, SYD, VLL, LLA, SIN (experimental).
- **Optimized User Agent**: Contributed by `jonellcc` for fewer account logouts.
- **Compatibility**: Tested with Mirai and autobot. 

## 🚀 Installation

Install the latest version of `ws3-fca` via npm:

```bash
npm install ws3-fca@latest
```

## 🛠 Usage

Below is an example of creating a simple echo bot that repeats messages sent to it:

```javascript
const wiegine = require("ws3-fca");

wiegine.login('Provide your cookie here',
  { /* setOptions here */ },
  (err, api) => {
    if (err) return console.error(err);
    api.listenMqtt((err, event) => {
      if (err) return console.error(err);
      api.sendMessage(event.body, event.threadID);
    });
  }
);
```

💡 Fun fact: You can also use **header string** based cookie.

🤔 How to get it? Head over to FAQ section below.

**Result**:  
![Echo Bot Example](https://cloud.githubusercontent.com/assets/4534692/20023545/f8c24130-a29d-11e6-9ef7-47568bdbc1f2.png)

## 🔧 Main Functionality

### Sending Messages
#### `api.sendMessage(message, threadID[, callback][, messageID])`

Send various types of messages:
- **Regular**: Use `body` for text messages.
- **Sticker**: Set `sticker` to a sticker ID.
- **File/Image**: Set `attachment` to a readable stream or array of streams.
- **URL**: Set `url` to a link.
- **Emoji**: Set `emoji` to an emoji string and `emojiSize` (`small`, `medium`, `large`).

**Note**: A message can include a `body` (optional) and one of: sticker, attachment, or URL. Find your `userID` in cookies under `c_user`.

**Example (Basic Message)**:
```javascript
const wiegine = require("ws3-fca");

wiegine.login('Provide your cookie here', (err, api) => {
  if (err) return console.error(err);
  const yourID = "000000000000000";
  const msg = "Hey!";
  api.sendMessage(msg, yourID);
});
```

**Example (File Upload)**:
```javascript
const fs = require("fs");
const wiegine = require("ws3-fca");

wiegine.login('Provide your cookie here', (err, api) => {
  if (err) return console.error(err);
  const yourID = "000000000000000";
  const msg = {
    body: "Hey!",
    attachment: fs.createReadStream(__dirname + "/image.jpg"),
  };
  api.sendMessage(msg, yourID);
});
```

### Saving Sessions
Save the cookie to avoid re-entering credentials:

```javascript
const fs = require("fs");
const wiegine = require("ws3-fca");
const cookie = 'Provide your cookie here';

wiegine.login(cookie, (err, api) => {
  if (err) return console.error(err);
  fs.writeFileSync("cookie.txt", cookie, "utf-8");
});
```

### Listening to Chats
#### `api.listenMqtt(callback)`

Listens for incoming messages. Enable events (e.g., join/leave, title changes) with `api.setOptions({ listenEvents: true })`. To include your own messages, use `api.setOptions({ selfListen: true })`.

**Example (Echo Bot with Stop Command)**:
```javascript
const fs = require("fs");
const wiegine = require("ws3-fca");

wiegine.login(fs.readFileSync("cookie.txt", "utf8"), (err, api) => {
  if (err) return console.error(err);
  api.setOptions({ listenEvents: true });

  const stopListening = api.listenMqtt((err, event) => {
    if (err) return console.error(err);

    api.markAsRead(event.threadID, (err) => {
      if (err) console.error(err);
    });

    switch (event.type) {
      case "message":
        if (event.body === "/stop") {
          api.sendMessage("Goodbye…", event.threadID);
          return stopListening();
        }
        api.sendMessage("TEST BOT: " + event.body, event.threadID);
        break;
      case "event":
        console.log(event);
        break;
    }
  });
});
```

## ❓ FAQ

**Q: How do I handle Promise rejection errors?**  
Add this code to your `index.js` to log unhandled rejections:

```javascript
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
```

**Q: How do I get a cookie?**  
Tutorial [here](https://appstate-tutorial-ws3.pages.dev) or use a cookie editor extension on browsers like Firefox, Kiwi, Edge, or Chrome. Provided tutorial is recommended.

**Q: What if I encounter errors?**  
Contact the developer [here](https://www.facebook.com/kennethaceberos) or join the [ChatBot Community](https://www.facebook.com/groups/coders.dev).

## 🌟 Projects Using This API

- **[c3c](https://github.com/lequanglam/c3c)**: Customizable bot with plugin support for Facebook and Discord.
- **[Miraiv2](https://github.com/miraiPr0ject/miraiv2)**: Simple Facebook Messenger bot by CatalizCS and SpermLord.
- **[hut-chat-api](https://github.com/jonellcc/hut-chat-api)**: Based on FCA by Jonell.

### Projects Using the Original `facebook-chat-api`
- [Messer](https://github.com/mjkaufer/Messer)
- [messen](https://github.com/tomquirk/messen)
- [Concierge](https://github.com/concierge/Concierge)
- [Marc Zuckerbot](https://github.com/bsansouci/marc-zuckerbot)
- [Marc Thuckerbot](https://github.com/bsansouci/lisp-bot)
- And more (see the original README for the full list).

## 📞 Support

For issues or questions, contact the developer [here](https://www.facebook.com/wieginesalpocialechavez) or join the [ChatBot Community](https://www.facebook.com/groups/coders.dev).

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.