require('dotenv').config();
const { Client, IntentsBitField, Guild} = require('discord.js');

const client = new Client({
     intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
     ]
})

client.on('guildMemberAdd', (c) => {
    const join = client.channels.cache.get("1281331104422428766");
    join.send(`Welcome <@${c.user.id}>. By joining this server you have agreed to join the Discarded Club/Clan unless you are already assigned to another clan. Leaving does not reverse this.`)
})

client.on('guildMemberRemove', (c) => {
    const leave = client.channels.cache.get("1281331308332584960");
    leave.send(`<@${c.user.id}> has left the server.`);
})

client.login(process.env.TOKEN);