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

// --- REGISTER COMMANDS INSTANTLY ---
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { 
            body: [
                new SlashCommandBuilder()
                    .setName('restock')
                    .setDescription('Announce a restock')
                    .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
                    .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))
            ] 
        });
    } catch (e) { /* Fail silently */ }
})();

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    
    const embed = new EmbedBuilder()
        .setTitle(`🔥 ${i.options.getString('product')} Restocked!`)
        .setDescription(`Price: ${i.options.getString('price')}`)
        .setColor(0x800080);
    
    const channel = client.channels.cache.get(IDS.ANNOUNCE);
    if (channel) await channel.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
    await i.reply({ content: 'Done.', ephemeral: true }).catch(() => {});
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild || msg.channel.id !== IDS.FARM) return;
    const content = msg.content.toLowerCase();

    if (content.startsWith('!auth')) {
        const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        if (member) await member.roles.add(IDS.BRONZE).catch(() => {});
        await msg.author.send(`Bronze access: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=identify+guilds.join`).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    else if (content.startsWith('!djoin')) {
        const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        if (member) await member.roles.add(IDS.BRONZE).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    else if (content.startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    else if (content.startsWith('!invitebot')) {
        await msg.channel.send(`Invite: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`).catch(() => {});
        await msg.delete().catch(() => {});
    }
    else if (!content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN).catch(() => process.exit(1));
