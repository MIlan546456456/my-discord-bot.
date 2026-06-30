require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    ANNOUNCE: '1521300660988149980',
    BRONZE: '1520843854079852725' 
};

// Decoupled Registration
async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const commands = [
            new SlashCommandBuilder()
                .setName('restock')
                .setDescription('Announce a restock')
                .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
                .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))
        ];
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    } catch (e) { console.error('Registration failed, continuing...'); }
}
registerCommands();

client.on('error', (err) => console.error('Client Error:', err.message));

client.once('ready', () => console.log(`Zynx Engine Online.`));

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'restock') {
        const embed = new EmbedBuilder()
            .setTitle(`🔥 ${i.options.getString('product')} Restocked!`)
            .setDescription(`Price: ${i.options.getString('price')}`)
            .setColor(0x800080);
        const channel = client.channels.cache.get(IDS.ANNOUNCE);
        if (channel) await channel.send({ content: '@everyone', embeds: [embed] });
        await i.reply({ content: 'Done.', ephemeral: true });
    }
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild || msg.channel.id !== IDS.FARM) return;

    if (msg.content.toLowerCase().startsWith('!auth')) {
        const member = await msg.guild.members.fetch(msg.author.id);
        await member.roles.add(IDS.BRONZE).catch(() => {});
        await msg.author.send(`Bronze access granted: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_URL&scope=identify+guilds.join`).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    else if (msg.content.toLowerCase().startsWith('!djoin')) {
        const member = await msg.guild.members.fetch(msg.author.id);
        await member.roles.add(IDS.BRONZE).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    else if (msg.content.toLowerCase().startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    // Added !invitebot
    else if (msg.content.toLowerCase().startsWith('!invitebot')) {
        await msg.channel.send(`Here is my invite link: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`).catch(() => {});
        await msg.delete().catch(() => {});
    }
    else if (!msg.content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
