const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, GuildMemberFlags} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lock')
		.setDescription('Locks a channel to a specific role or everyone')
        .addChannelOption(option =>
            option.setName("channel")
            .setDescription("Which channel should be locked?")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews)
            .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName("role")
            .setDescription("Which role should be locked?")
            .setRequired(false)
        )
        .addUserOption(option =>
            option.setName("user")
            .setDescription("Which channel should be locked for this user?")
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const targetRole = interaction.options.getRole('role') || interaction.options.getUser('user') || interaction.guild.roles.everyone;

        // Check if the target channel is text or news
        if (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildNews) {
            return await interaction.reply({
                content: 'You can only lock text or news channels.',
                ephemeral: true
            });
        }

        try {
            // Update the permissions for the role to allow viewing the channel
            await targetChannel.permissionOverwrites.edit(targetRole, {
                [PermissionFlagsBits.ViewChannel]: false
            });

            await interaction.reply({
                content: `🔓 The channel has been locked for the role: ${targetRole.name} If this was a User it was ${interaction.options.getUser('user')}.`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '❌ There was an error while locking the channel.',
                ephemeral: true
            });
        }
	},
};
