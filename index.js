require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');

const app = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] 
});

// Database
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ DB Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String, accessToken: String }));

// Locking mechanism to stop the spam seen in image_02294a.png
const processing = new Set();

const IDS = {
    ANNOUNCE: '1521300660988149980',
    TUTORIAL: '1520881451606737066',
    FARM: '1520843854079852725',
    VOUCH: '1521158198529364110'
};

client.once('ready', () => {
    client.user.setActivity('Zynx | Member Services', { type: ActivityType.Watching });
    console.log(`✅ Zynx is online: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // 1. !AUTH Command
    if (msg.content.toLowerCase() === '!auth') {
        const count = await User.countDocuments();
        const row = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
        await msg.reply({ content: `🔒 **Total Authorized:** ${count}`, components: row.components });
    }

    // 2. !DJOIN Command (Fixes image_02294a.png double-post issue)
    if (msg.content.toLowerCase().startsWith('!djoin')) {
        if (msg.channel.id !== IDS.FARM || processing.has(msg.author.id)) return;
        
        processing.add(msg.author.id);
        const count = await User.countDocuments();
        const reply = await msg.channel.send(`✅ Initializing join for **${count}** members.`);
        
        await msg.delete().catch(() => {});
        setTimeout(async () => {
            await reply.delete().catch(() => {});
            processing.delete(msg.author.id);
        }, 5000);
    }

    // 3. !VOUCH Command (Fixes DM and deletion issues)
    if (msg.content.toLowerCase().startsWith('!vouch')) {
        const content = msg.content.replace('!vouch', '').trim();
        if (!content) return;

        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) {
            await vCh.send({ embeds: [new EmbedBuilder().setTitle('⭐ New Vouch!').setDescription(content).setColor(0xFFFF00).setFooter({ text: `Vouched by ${msg.author.tag}` })] });
        }

        // DM the User
        await msg.author.send("✅ Thank you for your vouch! We appreciate your support.").catch(() => {});
        await msg.delete().catch(() => {});
    }
});

// Daily Cron Job
cron.schedule('50 01 * * *', async () => {
    const channel = client.channels.cache.get(IDS.ANNOUNCE);
    if (!channel) return;
    const count = await User.countDocuments();
    const embed = new EmbedBuilder()
        .setTitle('📢 Member Base Restock')
        .setDescription(`We have been restocked!\n\n**Authorized:** ${count}\n\n[Tutorial](https://discord.com/channels/${channel.guild.id}/${IDS.TUTORIAL})\n[Farm](https://discord.com/channels/${channel.guild.id}/${IDS.FARM})`)
        .setColor(0x00FF00);
    channel.send({ embeds: [embed] });
});

// Auth Server
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
