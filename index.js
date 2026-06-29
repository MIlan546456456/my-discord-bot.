require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron'); 
const app = express();

// --- 1. SETUP & DATABASE ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ Database Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String, accessToken: String }));

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] 
});

// --- 2. CONFIG ---
const ANNOUNCE_CHANNEL_ID = '1521300660988149980'; // Where it says the announcement
const TUTORIAL_CHANNEL_ID = '1520881451606737066'; // Where tutorial is
const FARM_CHANNEL_ID = '1520843854079852725';
const INVITE_LINK = 'discord.gg/qdkRRrQkF';

// --- 3. DAILY ANNOUNCEMENT (Cron Job) ---
// Runs at 01:50 every day
cron.schedule('50 01 * * *', async () => {
    const channel = client.channels.cache.get(ANNOUNCE_CHANNEL_ID);
    if (!channel) return;

    const count = await User.countDocuments();
    const embed = new EmbedBuilder()
        .setTitle('📢 Member Base Restock')
        .setDescription(`We have Been Restocked!\n\n**Authorized Accounts Available:** ${count}\n\nGo to <#${FARM_CHANNEL_ID}> to farm.\nGo to <#${TUTORIAL_CHANNEL_ID}> to learn how to farm.\n\n*Powered By Zynx*`)
        .setColor(0x00FF00)
        .setTimestamp();
    
    channel.send({ embeds: [embed] }).catch(console.error);
});

// --- 4. BOT LOGIC ---
client.once('ready', () => {
    console.log(`🚀 Bot is live: ${client.user.tag}`);
    setInterval(() => client.user.setActivity(INVITE_LINK, { type: ActivityType.Watching }), 60000);
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    if (msg.content === '!auth') {
        const count = await User.countDocuments();
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        return msg.channel.send({ content: `🔒 **Total Authorized:** ${count}`, components: row.components });
    }

    if (msg.content.startsWith('!djoin')) {
        if (msg.channel.id !== FARM_CHANNEL_ID) return;
        const count = await User.countDocuments();
        msg.reply(`✅ Initializing join for **${count}** members.`);
    }
});

// --- 5. AUTH HANDLER ---
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
