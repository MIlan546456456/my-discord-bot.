require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages] });

const USERS_FILE = './users.json';
const OWNER_ID = '1520203691276243096';
const processed = new Set(); // Global lock to stop double-processing

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // FIX: Double-post lock (prevents processing same message ID twice)
    if (processed.has(message.id)) return;
    processed.add(message.id);
    setTimeout(() => processed.delete(message.id), 5000);

    // --- ADMIN ---
    if (message.author.id === OWNER_ID) {
        if (message.content === '!massleave') {
            client.guilds.cache.forEach(g => { if (g.id !== message.guild.id) g.leave(); });
            return message.reply("✅ Left all servers.");
        }
    }

    // --- USER ---
    if (message.content === '!auth' || message.content === '!stats') {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        return message.reply(`🤖 **Status:** Online\n👥 **Authorized:** ${users.length}`);
    }

    if (message.content === '!authorize') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${process.env.BASE_URL}/login`).setStyle(ButtonStyle.Link));
        return message.channel.send({ content: '🔒 Click here to authorize:', components: [row] });
    }

    if (message.content.startsWith('!djoin')) {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.id === message.author.id);
        if (!user) {
            const m = await message.reply("❌ Use `!authorize` first.");
            setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
            return;
        }

        // Vouch DM
        message.author.send("👋 Hello! You used the member bot in ZYNX. Please type `+vouch` in the server within 24h to avoid a ban/blacklist.").catch(() => {});

        const sid = message.content.split(' ')[1];
        let count = 0;
        for (const u of users.slice(0, 2)) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${sid}/members/${u.id}`, { access_token: u.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) {}
        }
        
        const m = await message.reply(`✅ Success: Added ${count} members.`);
        setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 6000);
    }
});

// WEB AUTH FLOW
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/callback&response_type=code&scope=identify%20guilds.join`));
app.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: process.env.BASE_URL + '/callback' }).toString());
        const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
        let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        if (!users.find(u => u.id === userRes.data.id)) {
            users.push({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
            fs.writeFileSync(USERS_FILE, JSON.stringify(users));
        }
        res.send("<h1>Authorized!</h1>");
    } catch (e) { res.status(500).send("Auth Failed."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
