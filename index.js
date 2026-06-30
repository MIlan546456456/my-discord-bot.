require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// --- 1. WEB SERVER (Required to stop the Render loop) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is online.'));
app.listen(port, () => console.log(`Web server listening on port ${port}`));

// --- 2. BOT INITIALIZATION ---
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

// YOUR IDS
const IDS = { 
    FARM: '1520843854079852725', 
    ANNOUNCE: '1521300660988149980',
    FREE_BRONZE_CHANNEL: '1521199552990806156',
    ROLES: {
        BRONZE: '1521612408823484688',
        SILVER: '1521612629670629599',
        GOLD: '1521612908771938304',
        PREMIUM: '1521556021519056997',
        DIAMOND: '1521612680698265661',
        EMERALD: '1521556016796270686'
    }
};

// --- 3. SLASH COMMANDS ---
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
    } catch (e) { console.error("Slash command registration failed:", e); }
})();

// --- 4. EVENTS ---
client.once('ready', () => console.log('Zynx Engine is fully online.'));

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    const embed = new EmbedBuilder()
        .setTitle(`🔥 ${i.options.getString('product')} Restocked!`)
        .setDescription(`Price: ${i.options.getString('price')}`)
        .setColor(0x800080);
    const channel = client.channels.cache.get(IDS.ANNOUNCE);
    if (channel) await channel.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
    await i.reply({ content: 'Restock announced.', ephemeral: true }).catch(() => {});
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // Only process in the specified channels
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE_CHANNEL) return;

    const content = msg.content.toLowerCase();

    // !auth & !djoin logic
    if (content.startsWith('!auth') || content.startsWith('!djoin')) {
        const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        if (member) {
            await member.roles.add(IDS.ROLES.BRONZE).catch(() => {});
            
            if (content.startsWith('!auth')) {
                await msg.author.send(`Bronze access granted: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=identify+guilds.join`).catch(() => {});
            }
        }
        await msg.delete().catch(() => {});
    } 
    // +vouch logic
    else if (content.startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    // !invitebot logic
    else if (content.startsWith('!invitebot')) {
        await msg.channel.send(`Invite: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`).catch(() => {});
        await msg.delete().catch(() => {});
    }
    // Auto-pruner: delete non-commands
    else if (!content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
