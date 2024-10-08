const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unlock')
		.setDescription('Unlocks a channel to a specific role or everyone')
        .addChannelOption(option =>
            option.setName("channel")
            .setDescription("Which channel should be unlocked?")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews)
            .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName("role")
            .setDescription("Which role should be unlocked?")
            .setRequired(false)
        )
        .addUserOption(option =>
            option.setName("user")
            .setDescription("Which user should be unlocked?")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const targetRole = interaction.options.getRole('role') || interaction.options.getUser('user') || interaction.guild.roles.everyone;

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
                content: `🔓 The channel has been unlocked for the role: ${targetRole.name} If this was a User it was ${interaction.options.getUser('user')}.`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '❌ There was an error while unlocking the channel.',
                ephemeral: true
            });
        }
	},
};
