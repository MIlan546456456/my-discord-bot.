require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

// --- CONFIG ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages] });
const USERS_FILE = './users.json';
const BLACKLIST_FILE = './blacklist.json';
const LIMITS_FILE = './limits.json';
const OWNER_ID = '1520203691276243096';

// Initialization
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(BLACKLIST_FILE)) fs.writeFileSync(BLACKLIST_FILE, JSON.stringify([]));
if (!fs.existsSync(LIMITS_FILE)) fs.writeFileSync(LIMITS_FILE, JSON.stringify({}));

// Helper Functions
const getDB = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const saveDB = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

client.once('ready', () => { 
    client.user.setActivity('Farming ZYNX bots!', { type: ActivityType.Watching });
    console.log("Everything is active.");
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // ADMIN TOOLS
    if (message.author.id === OWNER_ID) {
        if (message.content.startsWith('!blacklist ')) {
            let list = getDB(BLACKLIST_FILE);
            list.push(message.content.split(' ')[1]);
            saveDB(BLACKLIST_FILE, list);
            return message.reply("✅ User blacklisted.");
        }
        if (message.content.startsWith('!setlimit ')) {
            let limits = getDB(LIMITS_FILE);
            limits[message.content.split(' ')[1]] = parseInt(message.content.split(' ')[2]);
            saveDB(LIMITS_FILE, limits);
            return message.reply("✅ Limit set.");
        }
        if (message.content.startsWith('!announce ')) {
            client.guilds.cache.forEach(g => {
                const c = g.systemChannel || g.channels.cache.find(ch => ch.permissionsFor(g.members.me).has('SendMessages'));
                if (c) c.send(message.content.replace('!announce ', ''));
            });
            return message.reply("✅ Announced.");
        }
        if (message.content === '!massleave') {
            client.guilds.cache.forEach(g => { if (g.id !== message.guild.id) g.leave(); });
            return message.reply("✅ Left all servers.");
        }
    }

    // USER COMMANDS
    if (message.content === '!auth' || message.content === '!stats') {
        return message.reply(`🤖 **Status:** Online\n👥 **Users:** ${getDB(USERS_FILE).length}`);
    }

    if (message.content === '!authorize') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${process.env.BASE_URL}/login`).setStyle(ButtonStyle.Link));
        return message.channel.send({ content: '🔒 Link your account:', components: [row] });
    }

    if (message.content.startsWith('!djoin')) {
        const users = getDB(USERS_FILE), black = getDB(BLACKLIST_FILE), limits = getDB(LIMITS_FILE);
        if (black.includes(message.author.id)) return message.reply("❌ Blacklisted.");
        const user = users.find(u => u.id === message.author.id);
        if (!user) return message.reply("❌ Use `!authorize` first.");
        
        // Vouch DM
        message.author.send("👋 Hello! You used the member bot in ZYNX. Please type `+vouch` in the server. You have 24h to do it or you will be banned and blacklisted.").catch(() => {});

        const sid = message.content.split(' ')[1];
        let count = 0;
        for (const u of users.slice(0, limits[message.author.id] || 2)) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${sid}/members/${u.id}`, { access_token: u.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) {}
        }
        return message.reply(`✅ Added ${count} members.`);
    }
});

// WEB FLOW
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/callback&response_type=code&scope=identify%20guilds.join`));
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({ client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: process.env.BASE_URL + '/callback' }).toString());
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } });
    let users = getDB(USERS_FILE);
    if (!users.find(u => u.id === userRes.data.id)) {
        users.push({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
        saveDB(USERS_FILE, users);
    }
    res.send("<h1>Authorized!</h1>");
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
