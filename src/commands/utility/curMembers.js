const { SlashCommandBuilder} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('membercount')
		.setDescription('Retrieve the current number of members'),
	async execute(interaction) {
		const memberCount = interaction.guild.memberCount;
        await interaction.reply(`The current number of members in this server is: ${memberCount}`);
	},
};