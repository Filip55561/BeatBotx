const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const clientId = process.env.CLIENT_ID;  
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

const commands = [];
const commandFiles = fs.readdirSync('/src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`/src/commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),  // For guild-based commands
            // Routes.applicationCommands(clientId),  // Uncomment for global commands
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
