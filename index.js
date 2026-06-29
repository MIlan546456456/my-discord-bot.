require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';

app.get('/login', (req, res) => {
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(BASE_URL + '/callback')}&response_type=code&scope=identify%20guilds.join`);
});

app.get('/callback', async (req, res) => {
    try {
        const { code } = req.query;
        await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: BASE_URL + '/callback'
        }).toString());
        res.send("<h1>Success!</h1>");
    } catch (err) {
        res.status(500).send("Error.");
    }
});

client.on('messageCreate', async (message) => {
    if (message.content === '!authorize') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Authorize')
                .setURL(`${BASE_URL}/login`)
                .setStyle(ButtonStyle.Link)
        );
        await message.channel.send({ content: 'Click below to authorize:', components: [row] });
    }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
