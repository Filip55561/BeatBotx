const { PermissionFlagsBits } = require('discord.js');

async function logCommand(guild, userTag, commandName, args = '', channel, user) {
    if (commandName === "membercount" || commandName === "flip") return;

    let logChannel;

    try {
        logChannel = guild.channels.cache.find(ch => ch.name === 'logs' && ch.type === 0);

        if (!logChannel) {
            // Create a new "logs" channel if not found
            logChannel = await guild.channels.create({
                name: 'logs',
                type: 0, 
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                ],
            });
            console.log('Created new "logs" channel.');
        }

        // Log the command execution in the found or created log channel
        if (user !== null) {
            await logChannel.send(`Command executed: /${commandName} ${args} by ${userTag} in ${channel} for ${user}`);
        } else {
            await logChannel.send(`Command executed: /${commandName} ${args} by ${userTag} in ${channel}`);
        }
    } catch (error) {
        console.error('Error fetching or creating log channel:', error);
    }
}

module.exports = { logCommand };
