require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// 1. Web Server (Keeps Render instance alive)
const app = express();
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

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

// 2. Slash Command Registration
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { 
            body: [new SlashCommandBuilder().setName('restock').setDescription('Announce a restock')
                .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
                .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))] 
        });
    } catch (e) {}
})();

// 3. Handlers
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    const embed = new EmbedBuilder().setTitle(`🔥 ${i.options.getString('product')} Restocked!`).setDescription(`Price: ${i.options.getString('price')}`).setColor(0x800080);
    const channel = client.channels.cache.get(IDS.ANNOUNCE);
    if (channel) await channel.send({ content: '@everyone', embeds: [embed] }).catch(() => {});
    await i.reply({ content: 'Restock announced.', ephemeral: true }).catch(() => {});
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild || (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE)) return;
    const c = msg.content.toLowerCase();

    if (c.startsWith('!auth') || c.startsWith('!djoin')) {
        const m = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        if (m) await m.roles.add(IDS.ROLES.BRONZE).catch(() => {});
        if (c.startsWith('!auth')) {
            await msg.author.send(`Bronze access: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=identify+guilds.join`).catch(() => {});
        } else {
            await msg.channel.send(`Farming member added for ${msg.author.username}`).catch(() => {});
        }
        await msg.delete().catch(() => {});
    } 
    else if (c.startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    else if (c.startsWith('!invitebot')) {
        await msg.channel.send(`Invite: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`).catch(() => {});
        await msg.delete().catch(() => {});
    }
    else if (!c.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
