require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// --- 1. CONFIG & DATABASE ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ MongoDB Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String, accessToken: String }));

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] 
});

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

// --- 2. AUTOMATION: STATUS CHECKER ---
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    const member = newPresence.member;
    if (!member) return;
    const customStatus = newPresence.activities.find(a => a.type === ActivityType.Custom)?.state;
    const isOnline = newPresence.status === 'online' || newPresence.status === 'dnd';

    if (isOnline && customStatus?.includes(INVITE_LINK)) {
        const bronzeRole = member.guild.roles.cache.get('1520852026823803002');
        if (bronzeRole && !member.roles.cache.has(bronzeRole.id)) {
            await member.roles.add(bronzeRole);
            member.send(`🎉 **Role Granted:** You now have the Bronze role for supporting us!`).catch(() => {});
        }
    }
});

// --- 3. COMMANDS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content === '!authorize') {
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        return message.channel.send({ content: '🔒 **Click to authorize:**', components: row.components });
    }

    if (message.content === '!djoin') {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        
        let limit = 2;
        for (const [roleId, amount] of Object.entries(TIERS)) {
            if (message.member.roles.cache.has(roleId)) limit = amount;
        }

        const totalAuth = await User.countDocuments();
        const count = Math.min(totalAuth, limit);
        
        message.reply(`✅ **Initializing join for ${count} members.** (Your Tier Limit: ${limit})`);
        
        message.member.send(`🚀 **Action Complete:** You have joined ${count} members to your server!`).catch(() => {});
    }
});

// --- 4. AUTH SERVER ---
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/callback&response_type=code&scope=identify%20guilds.join`));

app.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: `${process.env.BASE_URL}/callback` }).toString());
        const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
        await User.findOneAndUpdate({ id: userRes.data.id }, { accessToken: tokenRes.data.access_token }, { upsert: true });
        res.send("<h1>Authorized Successfully!</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
