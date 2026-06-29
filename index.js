require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// --- 1. SETUP & DATABASE ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ DB Connected"));
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

// --- 2. CONFIGURATION ---
const OWNER_ID = '1520203691276243096';
const LOG_CHANNEL_ID = '1521199552990806156'; // Announcement/Free Bronze
const FARM_CHANNEL_ID = '1520843854079852725';
const INVITE_LINK = 'discord.gg/qdkRRrQkF';

const TIERS = {
    '1520852026823803002': 5,  // Bronze
    '1520852270898483272': 7,  // Silver
    '1520852326800294058': 13, // Gold
    '1520852424108281897': 25, // Platinum
    '1520852492768903218': 35  // Diamond
};

// --- 3. BOT EVENTS ---
client.once('ready', () => {
    console.log(`🚀 Bot is live: ${client.user.tag}`);
    setInterval(() => client.user.setActivity('Farming: ' + INVITE_LINK, { type: ActivityType.Watching }), 60000);
});

// Auto-Assign Bronze Role
client.on('presenceUpdate', async (oldP, newP) => {
    if (!newP.member) return;
    const status = newP.activities.find(a => a.type === ActivityType.Custom)?.state;
    if ((newP.status === 'online' || newP.status === 'dnd') && status?.includes(INVITE_LINK)) {
        const role = newP.member.guild.roles.cache.get('1520852026823803002');
        if (role && !newP.member.roles.cache.has(role.id)) {
            await newP.member.roles.add(role).catch(() => {});
        }
    }
});

// --- 4. COMMAND HANDLER ---
client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    if (msg.content === '!auth' || msg.content === '!authorize') {
        const count = await User.countDocuments();
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        return msg.channel.send({ content: `🔒 **Secure Auth Portal**\n👥 **Authorized Users:** ${count}`, components: row.components });
    }

    if (msg.content.startsWith('!djoin')) {
        if (msg.channel.id !== FARM_CHANNEL_ID) return;
        
        let limit = 2;
        for (const [id, amount] of Object.entries(TIERS)) if (msg.member.roles.cache.has(id)) limit = amount;

        const count = Math.min(await User.countDocuments(), limit);
        msg.reply(`✅ Initializing join for **${count}** members (Tier limit: ${limit})`);
    }

    if (msg.author.id === OWNER_ID && msg.content.startsWith('!announce ')) {
        const text = msg.content.replace('!announce ', '');
        client.guilds.cache.forEach(g => {
            const c = g.systemChannel || g.channels.cache.find(ch => ch.permissionsFor(g.members.me).has('SendMessages'));
            if(c) c.send(text);
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
        res.send("<h1>Authorized Successfully!</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
