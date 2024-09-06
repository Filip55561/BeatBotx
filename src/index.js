const express = require('express');
const app = express();
const port = process.env.PORT || 8000;

app.get('/', (req, res) => res.send(''));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

require('dotenv').config();
const { Client, IntentsBitField, Guild, Collection} = require('discord.js');
const { logCommand } = require('./logger');
var childProcess = require('child_process');

const client = new Client({
     intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
     ]
})

// Command handling setup

client.commands = new Collection();
const fs = require('fs');
const commandDirectories = ['/utility', '/fun'];

for(const dir of commandDirectories) {
    const commandFiles = fs.readdirSync(`src/commands/${dir}`).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands${dir}/${file}`);
    client.commands.set(command.data.name, command);
}
}
childProcess.fork('src/deploy-commands');

client.on('guildMemberAdd', async(member) => {
    const join = client.channels.cache.get("1281331104422428766");
    
    join.send(`Welcome <@${member.user.id}>. By joining this server you have agreed to join the Discarded Club/Clan unless you are already assigned to another clan. Leaving does not reverse this. \n`)

    const role = member.guild.roles.cache.get("1281363538497245236");
        try {
            await member.roles.add(role);
            console.log(`Assigned role ${role.name} to ${member.user.tag}`);
        } catch (error) {
            console.error(`Could not assign role: ${error}`);
        }
})

client.on('guildMemberRemove', (c) => {
    const leave = client.channels.cache.get("1281331308332584960");
    leave.send(`<@${c.user.id}> has left the server.`);
})

client.on('messageCreate', (message) => {
    if(message.content == "uwu" && message.author.id == "559414108831875086") {
        message.reply(`<3`);
    }
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        command.execute(interaction);
        await logCommand(interaction.guild, interaction.user.tag, command.data.name, interaction.options.getInteger('seconds') || '', interaction.channel);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
});

client.login(process.env.TOKEN);