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
		const seconds = interaction.options.getInteger('seconds');

        if (seconds < 0 || seconds > 21600) {
            return await interaction.reply({
                content: 'Please provide a valid number of seconds between 0 and 21600.',
                ephemeral: true
            });
        }
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            await interaction.reply({
                content: `Slow mode set to ${seconds} seconds for this channel.`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'An error occurred while setting the slow mode.',
                ephemeral: true
            });
        }
	},
};