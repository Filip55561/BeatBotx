const { SlashCommandBuilder, PermissionFlagsBits, ChannelType} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('slowmode')
		.setDescription('Set the slowmode of this channel')
        .addIntegerOption(option =>
            option.setName("time")
            .setDescription("The number of seconds for slowmode")
            .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName("channel")
            .setDescription("What channel should this slowmode be applied at?")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildVoice)
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction) {
		const seconds = interaction.options.getInteger('time');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel; // Use the current channel if none is provided
        if (seconds < 0 || seconds > 21600) {
            return await interaction.reply({
                content: 'Please provide a valid number of seconds between 0 and 21600.',
                ephemeral: true
            });
        }

        if (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildNews) {
            return await interaction.reply({
                content: 'You can only set slowmode on text or news channels.',
                ephemeral: true
            })};

        try {
            await targetChannel.setRateLimitPerUser(seconds);
            await interaction.reply({
                content: `Slowmode set to ${seconds} seconds for ${targetChannel.name}.`,
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