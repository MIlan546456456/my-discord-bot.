require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// --- 1. WEB SERVER (Keeps instance alive) ---
const app = express();
app.listen(process.env.PORT || 3000);

// --- 2. CLIENT INITIALIZATION ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message] 
});

let authCount = 0; 

const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ANNOUNCE: '1521300660988149980',
    ROLES: {
        BRONZE: '1521612408823484688',
        SILVER: '1521612629670629599',
        GOLD: '1521612908771938304',
        PREMIUM: '1521556021519056997',
        DIAMOND: '1521612680698265661',
        EMERALD: '1521556016796270686'
    }
};

// --- 3. SLASH COMMANDS (Restock) ---
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { 
            body: [new SlashCommandBuilder()
                .setName('restock')
                .setDescription('Announce a restock')
                .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
                .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))] 
        });
    } catch (e) { console.error(e); }
})();

// --- 4. EVENT LISTENERS ---
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    const embed = new EmbedBuilder()
        .setTitle(`🔥 ${i.options.getString('product')} Restocked!`)
        .setDescription(`Price: ${i.options.getString('price')}`)
        .setColor(0x800080);
    const ch = client.channels.cache.get(IDS.ANNOUNCE);
    if (ch) await ch.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
    await i.reply({ content: 'Restock announced.', ephemeral: true }).catch(() => {});
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    const c = msg.content.toLowerCase();

    // !auth: Stats Dashboard
    if (c.startsWith('!auth')) {
        await msg.channel.send(`Total Authorizations: **${authCount}**`).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    // !djoin: Registration Engine
    else if (c.startsWith('!djoin')) {
        authCount++;
        if (msg.member) await msg.member.roles.add(IDS.ROLES.BRONZE).catch(console.error);
        await msg.delete().catch(() => {});
    }
    // +vouch: Cleanup
    else if (c.startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    // !invitebot: Expansion Tool
    else if (c.startsWith('!invitebot')) {
        await msg.channel.send(`Invite: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`).catch(() => {});
        await msg.delete().catch(() => {});
    }
    // Auto-Pruner: Maintain Channel Hygiene
    else if (!c.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
