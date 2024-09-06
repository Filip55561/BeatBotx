const { SlashCommandBuilder} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('flip')
		.setDescription('Flip a coin.'),
	async execute(interaction) {
		const flipResult = Math.random() < 0.5 ? 'Heads' : 'Tails';

        await(interaction.reply(`The coin landed on: **${flipResult}**!`));
	},
};