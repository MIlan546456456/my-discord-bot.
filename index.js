require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const app = express();
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

const BASE_URL = 'https://my-discord-bot-4h98.onrender.com';
const OWNER_ID = '1520203691276243096';
const AUTH_CHANNEL_ID = '1521111193903698053';
const WELCOME_CHANNEL_ID = '1521116293548343427';
const FARM_CHANNEL_ID = '1520843854079852725';
const USERS_FILE = 'users.json';
const BLACKLIST_FILE = 'blacklist.json';

const getJSON = (file) => { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; } catch (e) { return []; } };

client.once('ready', () => { client.user.setActivity('Farming bots!', { type: ActivityType.Watching }); });

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- OWNER COMMANDS ---
    if (message.author.id === OWNER_ID) {
        if (message.content.startsWith('!blacklist ')) {
            const uid = message.content.split(' ')[1];
            let list = getJSON(BLACKLIST_FILE);
            if (!list.includes(uid)) { list.push(uid); fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(list)); }
            return message.reply(`🚫 User ${uid} blacklisted.`);
        }
        if (message.content === '!massleave') {
            client.guilds.cache.forEach(g => { if (g.id !== message.guild.id) g.leave(); });
            return message.reply("✅ Left all servers except this one.");
        }
        if (message.content.startsWith('!announce ')) {
            const text = message.content.replace('!announce ', '');
            const embed = new EmbedBuilder().setTitle('📢 Announcement').setDescription(text).setColor(0x00FF00);
            return message.channel.send({ embeds: [embed] });
        }
    }

    // --- USER COMMANDS ---
    if (message.content === '!authorize') {
        if (message.channel.id !== AUTH_CHANNEL_ID) return;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Authorize').setURL(`${BASE_URL}/login`).setStyle(ButtonStyle.Link));
        return message.channel.send({ content: '🔒 Click below to authorize:', components: [row] });
    }

    if (message.content === '!auth' || message.content === '!stats') {
        const embed = new EmbedBuilder().setTitle('🤖 System Stats')
            .addFields({ name: 'Authorized Users', value: `${getJSON(USERS_FILE).length}`, inline: true }, { name: 'Status', value: 'Farming Bots Active 🟢', inline: true });
        return message.reply({ embeds: [embed] });
    }

    if (message.content.startsWith('!check ')) {
        const uid = message.content.split(' ')[1];
        const found = getJSON(USERS_FILE).find(u => u.id === uid);
        return message.reply(found ? `✅ User ${uid} is authorized.` : `❌ User ${uid} not found.`);
    }

    if (message.content.startsWith('!djoin')) {
        if (message.channel.id !== FARM_CHANNEL_ID) return;
        const users = getJSON(USERS_FILE);
        const blacklisted = getJSON(BLACKLIST_FILE);
        
        if (blacklisted.includes(message.author.id)) return message.reply("❌ You are blacklisted.");
        const user = users.find(u => u.id === message.author.id);
        if (!user) return message.reply("❌ Use `!authorize` first.");

        const roles = { '1520852026823803002': 5, '1520852270898483272': 7, '1520852326800294058': 10, '1520852424108281897': 15, '1520852492768903218': 35 };
        let limit = 2;
        for (const [r, l] of Object.entries(roles)) if (message.member.roles.cache.has(r)) limit = l;

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
        const m = await message.channel.send(`✅ Success: Added ${count} members to ${sid}.`);
        setTimeout(() => m.delete().catch(() => {}), 6000);
    }
});

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
        let users = getJSON(USERS_FILE);
        if (!users.find(u => u.id === userRes.data.id)) {
            users.push({ id: userRes.data.id, accessToken: tokenRes.data.access_token });
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            const channel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
            if (channel) {
                const msg = await channel.send(`✨ **Welcome <@${userRes.data.id}>!** Authorized. Go to <#${FARM_CHANNEL_ID}> and use \`!djoin <server_id>\`.`);
                setTimeout(() => msg.delete().catch(() => {}), 6000);
            }
        }
        res.send("<h1>Authorized!</h1>");
    } catch (err) { res.status(500).send("Error."); }
});

client.login(process.env.BOT_TOKEN);
app.listen(process.env.PORT || 3000);
