require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';
const FARM_CHANNEL_ID = '1520843854079852725';

const getUsers = () => {
    try { return fs.existsSync('users.json') ? JSON.parse(fs.readFileSync('users.json', 'utf8')) : []; } 
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
        const users = getUsers();
        if (!users.find(u => u.id === userRes.data.id)) {
            users.push({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
            fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
        }
        res.send("<h1>Success! You are authorized.</h1>");
    } catch (err) { res.status(500).send("Error."); }
});

client.on('messageCreate', async (message) => {
    if (message.content === '!authorize') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        await message.channel.send({ content: 'Click below to authorize:', components: [row] });
    }
    
    if (message.content === '!auth') {
        message.reply(`There are currently ${getUsers().length} users authorized.`);
    }

    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return message.reply("Please use it in the farm channel.");

        const authorizedUsers = getUsers();
        if (!authorizedUsers.find(u => u.id === message.author.id)) {
            return message.reply("❌ You are not authorized.");
        }

        const roles = {
            '1520852026823803002': 5,
            '1520852270898483272': 7,
            '1520852326800294058': 10,
            '1520852424108281897': 15,
            '1520852492768903218': 35
        };

        let limit = 0;
        for (const [roleId, count] of Object.entries(roles)) {
            if (message.member.roles.cache.has(roleId)) limit = count;
        }

        if (limit === 0) return message.reply("You do not have a valid role to use this command.");

        const targetServerId = message.content.split(' ')[1]?.replace(/[<|>]/g, '');
        if (!targetServerId) return message.reply("Usage: `!djoin <server_id>`");
        
        let count = 0;
        const usersToJoin = authorizedUsers.slice(0, limit);
        for (const user of usersToJoin) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${targetServerId}/members/${user.id}`, 
                    { access_token: user.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) { console.log(`Failed to add ${user.id}`); }
        }
        message.reply(`✅ Successfully joined ${count} user(s) into server ${targetServerId}.`);
    }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
