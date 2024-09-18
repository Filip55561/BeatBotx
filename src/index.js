require('dotenv').config();
const { Client, IntentsBitField, Collection } = require('discord.js');
const { logCommand } = require('./logger');
const fs = require('fs');
var childProcess = require('child_process');

// Discord client setup
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

// Setup command handling
client.commands = new Collection();
const commandDirectories = ['/utility', '/fun'];

for (const dir of commandDirectories) {
    const commandFiles = fs.readdirSync(`src/commands${dir}`).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands${dir}/${file}`);
        client.commands.set(command.data.name, command);
    }
}
childProcess.fork('src/deploy-commands');

client.on('guildMemberAdd', async (member) => {
    const join = client.channels.cache.get("1281331104422428766");
    join.send(`Welcome <@${member.user.id}>. By joining this server, you have agreed to join the Discarded Club/Clan unless you are already assigned to another clan. Leaving does not reverse this.`);
    
    const role = member.guild.roles.cache.get("1281363538497245236");
    let nickname = member.displayName;

    if (!nickname.startsWith("Discarded")) {
        nickname = "Discarded" + nickname;
    }

    try {
        await member.roles.add(role);
        if (!member.displayName.startsWith("Discarded")) {
            await member.setNickname(nickname);
        }
        console.log(`Assigned role ${role.name} to ${member.user.tag}, and set nickname to ${nickname}`);
    } catch (error) {
        console.error(`Could not assign role or set nickname: ${error}`);
    }
});

client.on('guildMemberRemove', (member) => {
    const leave = client.channels.cache.get("1281331308332584960");
    leave.send(`<@${member.user.id}> has left the server.`);
});

// Event: messageCreate (Handles message commands)
client.on('messageCreate', (message) => {
    if (message.content === "uwu" && message.author.id === "559414108831875086") {
        message.reply("<3");
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
        await logCommand(
            interaction.guild,
            interaction.user.tag,
            command.data.name,
            interaction.options.getInteger('time') || '',
            interaction.options.getChannel('channel') || interaction.channel,
            interaction.options.getUser('user')
        );
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
});

client.login(process.env.TOKEN);
module.exports = { client };
const web = require('./web.js');