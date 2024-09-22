const { Guild } = require('discord.js');

async function logCommand(guild, userTag, commandName, args = '', channel, user) {
    if (commandName === "membercount" || commandName === "flip") return;
    
    const logChannel = guild.channels.cache.find(ch => ch.name === 'logs' && ch.type === 'GUILD_TEXT');

    if (!logChannel) {
        console.error('Log channel not found!');
        return;
    }

    // Log the command execution
    if (user !== null) {
        await logChannel.send(`Command executed: /${commandName} ${args} by ${userTag} in ${channel} for ${user}`);
    } else {
        await logChannel.send(`Command executed: /${commandName} ${args} by ${userTag} in ${channel}`);
    }
}

module.exports = { logCommand };
