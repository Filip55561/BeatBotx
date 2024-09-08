const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, GuildMemberFlags} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unlock_user')
		.setDescription('Unlocks a member')
        .addUserOption(option =>
            option.setName("member")
            .setDescription("What member should be added")
            .setRequired(false)
        )
        .addChannelOption(option =>
            option.setName("channel")
            .setDescription("Which channel should be unlocked for this user?")
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction) {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        // Check if the target channel is text or news
        if (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildNews) {
            return await interaction.reply({
                content: 'You can only unlock text or news channels.',
                ephemeral: true
            });
        }

        try {
            // Update the permissions for the role to allow viewing the channel
            await targetChannel.permissionOverwrites.edit(interaction.options.getUser('member'), {
                [PermissionFlagsBits.ViewChannel]: true
            });

            await interaction.reply({
                content: `🔓 The channel ${targetChannel} has been unlocked for : ${interaction.options.getUser('member')}.`,
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
