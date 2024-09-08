const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unlock')
		.setDescription('Unlocks a channel to a specific role or everyone')
        .addChannelOption(option =>
            option.setName("channel")
            .setDescription("Which channel should be unlocked?")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews)
            .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName("role")
            .setDescription("Which role should be unlocked?")
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction) {
        // Get the specified channel or default to the current channel
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // Get the specified role or default to @everyone
        const targetRole = interaction.options.getRole('role') || interaction.guild.roles.everyone;

        // Check if the target channel is text or news
        if (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildNews) {
            return await interaction.reply({
                content: 'You can only unlock text or news channels.',
                ephemeral: true
            });
        }

        try {
            // Update the permissions for the role to allow viewing the channel
            await targetChannel.permissionOverwrites.edit(targetRole, {
                [PermissionFlagsBits.ViewChannel]: true
            });

            await interaction.reply({
                content: `🔓 The channel has been unlocked for the role: ${targetRole.name}.`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '❌ There was an error unlocking the channel.',
                ephemeral: true
            });
        }
	},
};
