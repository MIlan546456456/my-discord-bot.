require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs'); // Needed to save the users
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';

// HELPER: Load and Save Users
const getUsers = () => fs.existsSync('users.json') ? JSON.parse(fs.readFileSync('users.json')) : [];
const saveUser = (user) => {
    const users = getUsers();
    if (!users.find(u => u.id === user.id)) {
        users.push(user);
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    }
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
        saveUser({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
        res.send("<h1>Success! You are authorized.</h1>");
    } catch (err) { res.status(500).send("Error."); }
});

client.on('messageCreate', async (message) => {
    if (message.content === '!authorize') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        await message.channel.send({ content: 'Click below to authorize:', components: [row] });
    }

    if (message.content.startsWith('!djoin')) {
        const args = message.content.split(' ');
        const targetServerId = args[1];
        const authorizedUsers = getUsers();
        
        if (!targetServerId) return message.reply("Usage: `!djoin <server_id>`");
        if (authorizedUsers.length === 0) return message.reply("No users are authorized!");

        let count = 0;
        for (const user of authorizedUsers) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${targetServerId}/members/${user.id}`, 
                    { access_token: user.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) { console.log(`Failed to add ${user.id}`); }
        }
        message.reply(`Successfully joined ${count} user(s) into ${targetServerId}`);
    }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
