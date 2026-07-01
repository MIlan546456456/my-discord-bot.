require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { QuickDB } = require('quick.db');
const express = require('express');

// --- 1. WEB SERVER (24/7 Uptime) ---
const app = express();
app.listen(process.env.PORT || 3000);

const db = new QuickDB();
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ANNOUNCE: '1521300660988149980',
    ROLES: { BRONZE: '1521612408823484688' }
};

// --- 2. COMMAND LOGIC ---
client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    const c = msg.content.toLowerCase();

    // !djoin: Registration Engine
    if (c.startsWith('!djoin')) {
        let count = await db.get("authCount") || 0;
        await db.set("authCount", count + 1);
        if (msg.member) await msg.member.roles.add(IDS.ROLES.BRONZE).catch(console.error);
        await msg.delete().catch(() => {});
    } 
    // !auth: Professional Stats Display
    else if (c.startsWith('!auth')) {
        let count = await db.get("authCount") || 0;
        const embed = new EmbedBuilder()
            .setTitle("📊 Zynx Authorization Stats")
            .setDescription(`Total successful authorizations recorded: **${count}**`)
            .setColor(0x800080)
            .setTimestamp();
        await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(() => {});
    }
    // !invitebot: Professional Embed Invite
    else if (c.startsWith('!invitebot')) {
        const embed = new EmbedBuilder()
            .setTitle("🤖 Add Zynx to Your Server")
            .setDescription("To use `!djoin` and our automated engine in your own server, click the button below.")
            .setColor(0x800080)
            .addFields({ name: "Step 1", value: "Click the link below to authorize." }, { name: "Step 2", value: "Ensure the bot has 'Manage Roles' permission." });
        
        await msg.channel.send({ embeds: [embed], content: `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot` });
        await msg.delete().catch(() => {});
    }
    // +vouch & Cleanup
    else if (c.startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    else if (!c.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

// --- 3. SLASH COMMANDS (/restock) ---
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    const embed = new EmbedBuilder()
        .setTitle(`🔥 ${i.options.getString('product')} Restocked`)
        .addFields({ name: "Price", value: i.options.getString('price'), inline: true })
        .setColor(0x800080)
        .setTimestamp();
    const ch = client.channels.cache.get(IDS.ANNOUNCE);
    if (ch) await ch.send({ content: '@everyone', embeds: [embed] });
    await i.reply({ content: 'Restock notification sent.', ephemeral: true });
});

client.login(process.env.BOT_TOKEN);
