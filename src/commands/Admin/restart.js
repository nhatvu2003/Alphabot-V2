const config = {
    name: "restart",
    aliases: ["rs", "rest", "reboot"],
    permissions: [2],
    isAbsolute: true
}

async function Running({ message, getLang }) {
    await message.reply("Restarting...");
    global.restart();
}

export default {
    config,
    Running
}
