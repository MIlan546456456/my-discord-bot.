require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// --- 1. DATABASE & CLIENT SETUP ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ MongoDB Connected"));
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

const OWNER_ID = '1520203691276243096';
const LOG_CHANNEL_ID = '1521201210764427385';

// --- 2. PROFESSIONAL UTILITIES ---
function logAction(title, desc) {
    const channel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (channel) {
        channel.send({ embeds: [new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x0099FF).setTimestamp()] });
    }
}

client.once('ready', () => {
    setInterval(() => {
        client.user.setActivity('Farming members! .gg/4P67XHPBp', { type: ActivityType.Watching });
    }, 60000);
    console.log(`🚀 Bot is live: ${client.user.tag}`);
});

// --- 3. COMMANDS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // !authorize
    if (message.content === '!authorize') {
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        return message.channel.send({ content: '🔒 **Secure Authorization:**', components: row.components });
    }

    // !stats
    if (message.content === '!stats') {
        const count = await User.countDocuments();
        return message.reply(`👥 **Total Authorized Users:** ${count}`);
    }

    // !joinhelp (Marketing)
    if (message.content === '!joinhelp') {
        message.channel.send({ embeds: [new EmbedBuilder().setTitle('🚀 Need Members?').setDescription('Put **https://discord.gg/qdkRRrQkF** in your status for free **Bronze** tier access!').setColor(0x00FF00)] });
        logAction('Marketing Used', `User ${message.author.tag} triggered marketing.`);
    }

    // !checkstatus @user
    if (message.content.startsWith('!checkstatus ')) {
        const member = message.mentions.members.first();
        if (!member) return message.reply("❌ Please mention a user to check.");
        message.reply(member.presence?.status === 'online' ? `✅ ${member.user.username} is **Online**.` : `❌ ${member.user.username} is **Offline/Idle/DND**.`);
    }

    // !announce (Owner Only)
    if (message.author.id === OWNER_ID && message.content.startsWith('!announce ')) {
        const text = message.content.replace('!announce ', '');
        client.guilds.cache.forEach(g => {
            const c = g.systemChannel || g.channels.cache.find(ch => ch.permissionsFor(g.members.me).has('SendMessages'));
            if (c) c.send({ embeds: [new EmbedBuilder().setTitle('📢 Announcement').setDescription(text).setColor(0xFFD700)] });
        });
        logAction('Announcement Sent', text);
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
        
        logAction('New Authorization', `User: <@${userRes.data.id}>`);
        res.send("<h1>Authorized Successfully!</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
