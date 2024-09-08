const { Guild } = require('discord.js');

const LOG_CHANNEL_ID = '1281328074910076991';

async function logCommand(guild, userTag, commandName, args = '', channel, user) {
    if(commandName === "membercount" || commandName === "flip") return;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    
    if(user !== null) {
        if (logChannel) {
            await logChannel.send(`Command executed: /${commandName} ${args} by ${userTag} in ${channel} for ${user}`);
        } else {
            console.error('Log channel not found!');
        }
    } else {
        await logChannel.send(`Command executed: /${commandName} ${args} by ${userTag} in ${channel}`);
    }
}


module.exports = { logCommand };