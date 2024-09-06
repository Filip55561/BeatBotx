const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('slowmode')
		.setDescription('Set the slowmode of this channel')
        .addIntegerOption(option =>
            option.setName("seconds")
            .setDescription("The number of seconds for slowmode")
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction) {
		const seconds = interaction.option.getInteger('seconds');

        if (seconds < 0 || seconds > 21600) {
            return await interaction.reply('Please provide a valid number of seconds between 0 and 21600.')
            
        }
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            await interaction.reply(`Slow mode set to ${seconds} seconds for this channel.`);
        } catch (error) {
            console.error(error);
            await interaction.reply('An error occurred while setting the slow mode.');
        }
	},
};