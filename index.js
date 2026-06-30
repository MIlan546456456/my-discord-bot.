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

// --- DATABASE ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Database successfully connected."))
    .catch(err => console.error("❌ DB Connection Error:", err));

const User = mongoose.model('User', new mongoose.Schema({ id: String, accessToken: String }));

// --- CONFIG ---
const IDS = {
    ANNOUNCE: '1521300660988149980',
    TUTORIAL: '1520881451606737066',
    FARM: '1520843854079852725',
    VOUCH: '1521158198529364110'
};

// --- CORE UTILITIES ---
client.once('ready', () => {
    console.log(`✅ Zynx is online as ${client.user.tag}`);
    client.user.setActivity('Zynx | Member Services', { type: ActivityType.Playing });
});

// --- COMMAND LOGIC ---
client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    try {
        // 1. !AUTH
        if (msg.content.toLowerCase() === '!auth') {
            const count = await User.countDocuments();
            const embed = new EmbedBuilder()
                .setTitle('🔒 Authorization Center')
                .setDescription(`Total Users in Pool: **${count}**\n\nClick the button below to authorize.`)
                .setColor(0x5865F2);
            
            const btn = { components: [{ type: 1, components: [{ type: 2, label: 'Authorize Discord', style: 5, url: `${process.env.BASE_URL}/login` }] }] };
            await msg.reply({ embeds: [embed], components: btn.components });
        }

        // 2. !DJOIN
        if (msg.content.toLowerCase().startsWith('!djoin')) {
            if (msg.channel.id !== IDS.FARM) return;
            const count = await User.countDocuments();
            const reply = await msg.channel.send(`✅ **Initializing Join Process:** Starting for ${count} members...`);
            
            await msg.delete().catch(() => {});
            setTimeout(() => reply.delete().catch(() => {}), 7000);
        }

        // 3. !VOUCH
        if (msg.content.toLowerCase().startsWith('!vouch')) {
            const text = msg.content.replace('!vouch', '').trim();
            if (!text) return msg.reply("Usage: `!vouch [your review here]`");

            // Post to channel
            const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
            if (vCh) {
                const embed = new EmbedBuilder()
                    .setTitle('⭐ New Customer Vouch')
                    .setDescription(text)
                    .setColor(0xFFFF00)
                    .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
                    .setTimestamp();
                await vCh.send({ embeds: [embed] });
            }

            // DM the User
            await msg.author.send("✅ **Thank you for your vouch!** We value your support in the Zynx ecosystem.").catch(() => {
                console.log("User has DMs closed.");
            });

            await msg.delete().catch(() => {});
        }
    } catch (err) {
        console.error("Command Error:", err);
    }
});

// --- AUTOMATION (CRON) ---
cron.schedule('50 01 * * *', async () => {
    const channel = client.channels.cache.get(IDS.ANNOUNCE);
    if (!channel) return;
    const count = await User.countDocuments();
    const embed = new EmbedBuilder()
        .setTitle('📢 DAILY RESTOCK ALERT')
        .setDescription(`Member pool has been refreshed.\n\n**Authorized Available:** ${count}\n\n[Tutorial Channel](https://discord.com/channels/${channel.guild.id}/${IDS.TUTORIAL})\n[Farm Channel](https://discord.com/channels/${channel.guild.id}/${IDS.FARM})`)
        .setColor(0x00FF00);
    channel.send({ embeds: [embed] });
});

// --- OAUTH2 SERVER ---
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/callback&response_type=code&scope=identify%20guilds.join`));
app.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: `${process.env.BASE_URL}/callback` }).toString());
        const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
        await User.findOneAndUpdate({ id: userRes.data.id }, { accessToken: tokenRes.data.access_token }, { upsert: true });
        res.send("<h1>Authorized Successfully! You can close this window.</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
