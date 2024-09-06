const { Guild } = require('discord.js');

const LOG_CHANNEL_ID = '1281328074910076991';

async function logCommand(guild, userTag, commandName, args = '', channel) {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
        await logChannel.send(`Command executed: /${commandName} ${args}by ${userTag} in ${channel}`);
    } else {
        console.error('Log channel not found!');
    }
}

module.exports = { logCommand };