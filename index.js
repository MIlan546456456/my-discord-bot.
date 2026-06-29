require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// --- 1. CONFIG & DATABASE ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ MongoDB Connected: Data is Permanent"));
const User = mongoose.model('User', new mongoose.Schema({ id: String, accessToken: String }));

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildPresences, 
        GatewayIntentBits.GuildMembers
    ] 
});

// IDs from our chat
const OWNER_ID = '1520203691276243096';
const LOG_CHANNEL_ID = '1521199552990806156';
const FARM_CHANNEL_ID = '1520843854079852725';
const INVITE_LINK = 'discord.gg/qdkRRrQkF';

const TIERS = {
    '1520852026823803002': 5,  // Bronze
    '1520852270898483272': 7,  // Silver
    '1520852326800294058': 13, // Gold
    '1520852424108281897': 25, // Platinum
    '1520852492768903218': 35  // Diamond
};

// --- 2. UTILITIES ---
function logAction(title, desc) {
    const channel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (channel) channel.send({ embeds: [new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x0099FF).setTimestamp()] });
}

// --- 3. EVENTS ---
client.once('ready', () => {
    setInterval(() => client.user.setActivity('Farming members! ' + INVITE_LINK, { type: ActivityType.Watching }), 60000);
    console.log(`🚀 Bot is live: ${client.user.tag}`);
});

// Auto-assign Bronze when status matches
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    const member = newPresence.member;
    if (!member) return;
    const customStatus = newPresence.activities.find(a => a.type === ActivityType.Custom)?.state;
    const isOnline = newPresence.status === 'online' || newPresence.status === 'dnd';

    if (isOnline && customStatus?.includes(INVITE_LINK)) {
        const bronzeRole = member.guild.roles.cache.get('1520852026823803002');
        if (bronzeRole && !member.roles.cache.has(bronzeRole.id)) {
            await member.roles.add(bronzeRole).catch(() => {});
            member.send(`🎉 **Role Granted:** You now have the Bronze role for supporting us!`).catch(() => {});
        }
    }
});

// --- 4. COMMANDS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // !auth or !authorize
    if (message.content === '!authorize' || message.content === '!auth') {
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        return message.channel.send({ content: '🔒 **Click to authorize:**', components: row.components });
    }

    // !stats
    if (message.content === '!stats') {
        const count = await User.countDocuments();
        return message.reply(`🤖 **Status:** Online\n👥 **Authorized Users:** ${count}`);
    }

    // !djoin (Locked to Farm Channel)
    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        
        let limit = 2; // Default
        for (const [roleId, amount] of Object.entries(TIERS)) {
            if (message.member.roles.cache.has(roleId)) limit = amount;
        }

        const totalAuth = await User.countDocuments();
        const count = Math.min(totalAuth, limit);
        
        message.reply(`✅ **Initializing join for ${count} members.** (Your Tier Limit: ${limit})`);
        
        // Log the action
        logAction('Join Success', `${message.author.tag} joined ${count} members (Limit: ${limit})`);
    }

    // !announce (Owner Only)
    if (message.author.id === OWNER_ID && message.content.startsWith('!announce ')) {
        const text = message.content.replace('!announce ', '');
        client.guilds.cache.forEach(g => {
            const c = g.systemChannel || g.channels.cache.find(ch => ch.permissionsFor(g.members.me).has('SendMessages'));
            if (c) c.send({ embeds: [new EmbedBuilder().setTitle('📢 Announcement').setDescription(text).setColor(0xFFD700)] });
        });
    }
});

// --- 5. AUTH SERVER ---
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/callback&response_type=code&scope=identify%20guilds.join`));

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: `${process.env.BASE_URL}/callback` }).toString());
        const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
        
        await User.findOneAndUpdate({ id: userRes.data.id }, { accessToken: tokenRes.data.access_token }, { upsert: true });
        logAction('New Authorization', `User: <@${userRes.data.id}>`);
        
        res.send("<h1>Authorized Successfully!</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
