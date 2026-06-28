const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// --- CONFIGURATION ---
// Use process.env for security on Render
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const REDIRECT_URI = process.env.REDIRECT_URI; // Set this in Render Environment variables
const INVITE_LINK = process.env.INVITE_LINK;

let authorizedUsers = [];

// --- WEB SERVER ---
app.get('/login', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;
    res.redirect(url);
});

app.get('/callback', async (req, res) => {
    try {
        const code = req.query.code;
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code: code, redirect_uri: REDIRECT_URI
        }).toString());

        const accessToken = tokenResponse.data.access_token;
        const user = (await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } })).data;

        authorizedUsers.push({ userId: user.id, accessToken: accessToken });
        res.send("<h1>Success!</h1><p>You have been added to the pool.</p>");
    } catch (err) {
        res.send("<h1>Error</h1><p>Authorization failed.</p>");
    }
});

// --- DISCORD BOT ---
client.on('messageCreate', async (message) => {
    if (message.content === '!authorize') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Authorize').setURL(`${process.env.BASE_URL}/login`).setStyle(ButtonStyle.Link)
        );
        message.channel.send({ content: 'Click below to authorize:', components: [row] });
    }

    if (message.content === '!invitebot') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite Bot').setURL(INVITE_LINK).setStyle(ButtonStyle.Link)
        );
        message.channel.send({ content: 'Add me to your server:', components: [row] });
    }

    if (message.content.startsWith('!djoin')) {
        const args = message.content.split(' ');
        const targetServerId = args[1];
        if (!targetServerId) return message.reply("Usage: `!djoin <server_id>`");
        if (authorizedUsers.length === 0) return message.reply("No users are authorized!");

        const roles = {
            '1520852026823803002': 5,
            '1520852270898483272': 10,
            '1520852424108281897': 25,
            '1520852492768903218': 35
        };

        let limit = 2;
        for (const [roleId, count] of Object.entries(roles)) {
            if (message.member.roles.cache.has(roleId)) { limit = count; break; }
        }

        const usersToJoin = authorizedUsers.splice(0, Math.min(authorizedUsers.length, limit));
        for (const user of usersToJoin) {
            try {
                await axios.put(`https://discord.com/api/guilds/${targetServerId}/members/${user.userId}`, 
                    { access_token: user.accessToken }, { headers: { 'Authorization': `Bot ${BOT_TOKEN}` } });
            } catch (e) { console.log(`Failed to add ${user.userId}`); }
        }
        message.reply(`Successfully joined ${usersToJoin.length} user(s) into ${targetServerId}!`);
    }
});

app.listen(process.env.PORT || 3000);
client.login(BOT_TOKEN);