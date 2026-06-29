require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';
const AUTH_CHANNEL_ID = '1521111193903698053';
const FARM_CHANNEL_ID = '1520843854079852725';
const USERS_FILE = 'users.json';

// Utility to handle data safely
const getUsers = () => {
    try { return fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) : []; } 
    catch (e) { console.error("Error reading users:", e); return []; }
};

// OAuth2 Auth Flow
app.get('/login', (req, res) => {
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(BASE_URL + '/callback')}&response_type=code&scope=identify%20guilds.join`);
});

app.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code', code: code, redirect_uri: BASE_URL + '/callback'
        }).toString());
        
        const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
        let users = getUsers();
        if (!users.find(u => u.id === userRes.data.id)) {
            users.push({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            
            // Welcome Ping Logic
            const channel = await client.channels.fetch(AUTH_CHANNEL_ID).catch(() => null);
            if (channel) {
                const msg = await channel.send(`✅ Welcome <@${userRes.data.id}>! You successfully authorized. Go to the farm channel and use !djoin.`);
                setTimeout(() => msg.delete().catch(() => {}), 6000);
            }
        }
        res.send("<h1>Authorized! You can close this window.</h1>");
    } catch (err) { res.status(500).send("Auth Failed."); }
});

// Bot Command Logic
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // !authorize
    if (message.content === '!authorize') {
        if (message.channel.id !== AUTH_CHANNEL_ID) return;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        return message.channel.send({ content: 'Click here to authorize:', components: [row] });
    }

    // !auth
    if (message.content === '!auth') {
        return message.reply(`Current total authorized users: ${getUsers().length}`);
    }

    // !djoin
    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        const users = getUsers();
        if (!users.find(u => u.id === message.author.id)) return message.reply("❌ You are not authorized. Use `!authorize` first.");

        const roles = { '1520852026823803002': 5, '1520852270898483272': 7, '1520852326800294058': 10, '1520852424108281897': 15, '1520852492768903218': 35 };
        let limit = 2; // Default limit
        for (const [r, l] of Object.entries(roles)) if (message.member.roles.cache.has(r)) limit = l;

        const sid = message.content.split(' ')[1]?.replace(/[<|>]/g, '');
        if (!sid) return message.reply("Usage: `!djoin <server_id>`");
        
        let count = 0;
        for (const u of users.slice(0, limit)) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${sid}/members/${u.id}`, { access_token: u.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) { console.error(`Failed to join ${u.id}: ${e.message}`); }
        }
        
        // Channel Cleanup
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        await message.channel.bulkDelete(fetched.filter(m => m.author.id !== message.author.id), true).catch(() => {});
        const m = await message.channel.send(`✅ Successfully added ${count} user(s) to ${sid}.`);
        setTimeout(() => m.delete().catch(() => {}), 6000);
    }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
