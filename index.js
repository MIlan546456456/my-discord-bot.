require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected: Data is now permanent."))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Schema for permanent storage
const userSchema = new mongoose.Schema({ id: String, accessToken: String });
const User = mongoose.model('User', userSchema);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] 
});

const OWNER_ID = '1520203691276243096';
const LOG_CHANNEL_ID = '1521201210764427385';
const FARM_CHANNEL_ID = '1520843854079852725';

client.once('ready', () => {
    setInterval(() => {
        client.user.setActivity('Farming members! .gg/4P67XHPBp', { type: ActivityType.Watching });
    }, 60000);
    console.log(`🚀 Bot is live: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // !stats (Now pulling from MongoDB)
    if (message.content === '!stats' || message.content === '!auth') {
        const count = await User.countDocuments();
        return message.reply(`🤖 **Status:** Online\n👥 **Authorized Users:** ${count}`);
    }

    // !authorize
    if (message.content === '!authorize') {
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        return message.channel.send({ content: '🔒 Click to authorize:', components: row.components });
    }

    // !djoin (Locked to Farm Channel)
    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        message.reply("✅ Joining process initialized...");
    }

    // !announce
    if (message.author.id === OWNER_ID && message.content.startsWith('!announce ')) {
        const text = message.content.replace('!announce ', '');
        client.guilds.cache.forEach(g => {
            const c = g.systemChannel || g.channels.cache.find(ch => ch.permissionsFor(g.members.me).has('SendMessages'));
            if (c) c.send({ embeds: [new EmbedBuilder().setTitle('📢 Announcement').setDescription(text).setColor(0xFFD700)] });
        });
    }
});

// --- AUTH SERVER ---
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/callback&response_type=code&scope=identify%20guilds.join`));

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: `${process.env.BASE_URL}/callback` }).toString());
        const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
        
        // SAVE TO MONGODB (This will not reset!)
        await User.findOneAndUpdate({ id: userRes.data.id }, { accessToken: tokenRes.data.access_token }, { upsert: true });
        
        res.send("<h1>Authorized Successfully!</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
