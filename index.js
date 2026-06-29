require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages] 
});

// Paths for persistent data
const USERS_PATH = path.join(process.cwd(), 'users.json');
const BLACKLIST_PATH = path.join(process.cwd(), 'blacklist.json');
const LIMITS_PATH = path.join(process.cwd(), 'limits.json');

const OWNER_ID = '1520203691276243096';
const AUTH_CHANNEL_ID = '1521111193903698053';
const WELCOME_CHANNEL_ID = '1521116293548343427';
const FARM_CHANNEL_ID = '1520843854079852725';

const getJSON = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : (p === USERS_PATH || p === BLACKLIST_PATH ? [] : {});
const saveJSON = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

client.once('ready', () => {
    client.user.setActivity('Farming bots!', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- OWNER TOOLS ---
    if (message.author.id === OWNER_ID) {
        if (message.content.startsWith('!blacklist ')) {
            const uid = message.content.split(' ')[1];
            let list = getJSON(BLACKLIST_PATH);
            if (!list.includes(uid)) { list.push(uid); saveJSON(BLACKLIST_PATH, list); }
            return message.reply(`🚫 Blacklisted ${uid}.`);
        }
        if (message.content === '!massleave') {
            client.guilds.cache.forEach(g => { if (g.id !== message.guild.id) g.leave(); });
            return message.reply("✅ Left all servers.");
        }
        if (message.content.startsWith('!announce ')) {
            const text = message.content.replace('!announce ', '');
            client.guilds.cache.forEach(g => {
                const c = g.channels.cache.find(c => c.permissionsFor(g.members.me).has('SendMessages'));
                if (c) c.send({ embeds: [new EmbedBuilder().setTitle('📢 ANNOUNCEMENT').setDescription(text).setColor(0xFF0000)] });
            });
            return message.reply("✅ Announced.");
        }
        if (message.content.startsWith('!setlimit ')) {
            const [_, uid, amt] = message.content.split(' ');
            let l = getJSON(LIMITS_PATH);
            l[uid] = parseInt(amt);
            saveJSON(LIMITS_PATH, l);
            return message.reply(`✅ Set limit for ${uid} to ${amt}.`);
        }
    }

    // --- CORE COMMANDS ---
    if (message.content === '!authorize' && message.channel.id === AUTH_CHANNEL_ID) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        return message.channel.send({ content: '🔒 Authorize here:', components: [row] });
    }

    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        const users = getJSON(USERS_PATH), blacklisted = getJSON(BLACKLIST_PATH), limits = getJSON(LIMITS_PATH);
        if (blacklisted.includes(message.author.id)) return message.reply("❌ Blacklisted.");
        const user = users.find(u => u.id === message.author.id);
        if (!user) return message.reply("❌ Use `!authorize` first.");

        // DM Vouch Instruction
        message.author.send("👋 **Hello!** You used the member bot in ZYNX. Please type `+vouch` in the server within 24h to avoid a ban/blacklist.").catch(() => {});

        let limit = limits[message.author.id] || 2;
        if (!limits[message.author.id]) {
            const roles = { '1520852026823803002': 5, '1520852270898483272': 7, '1520852326800294058': 10, '1520852424108281897': 15, '1520852492768903218': 35 };
            for (const [r, l] of Object.entries(roles)) if (message.member.roles.cache.has(r)) limit = l;
        }

        const sid = message.content.split(' ')[1]?.replace(/[<|>]/g, '');
        if (!sid) return message.reply("⚠️ Usage: `!djoin <server_id>`");
        
        let count = 0;
        for (const u of users.slice(0, limit)) {
            try {
                await axios.put(`https://discord.com/api/v10/guilds/${sid}/members/${u.id}`, { access_token: u.accessToken }, { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } });
                count++;
            } catch (e) {}
        }
        
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        await message.channel.bulkDelete(fetched, true).catch(() => {});
        const m = await message.channel.send(`✅ Added ${count} members.`);
        setTimeout(() => m.delete().catch(() => {}), 6000);
    }
});

// OAuth2 Flow
app.get('/login', (req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.BASE_URL + '/callback')}&response_type=code&scope=identify%20guilds.join`));

app.get('/callback', async (req, res) => {
    // ... (Your token exchange logic)
    // After getting user:
    let users = getJSON(USERS_PATH);
    if (!users.find(u => u.id === userRes.data.id)) {
        users.push({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
        saveJSON(USERS_PATH, users);
    }
    res.send("<h1>Authorized!</h1>");
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
