require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// --- 1. WEB SERVER (Fixes the "No open ports" warning) ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Zynx Engine is Online'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// --- 2. CLIENT INITIALIZATION ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message] 
});

let authCount = 0; 
const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ROLES: { BRONZE: '1521612408823484688' }
};

client.once('ready', () => console.log(`--- BOT IS ONLINE: ${client.user.tag} ---`));

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    const c = msg.content.toLowerCase();

    // Commands
    if (c.startsWith('!auth')) {
        await msg.channel.send(`Total Authorizations: **${authCount}**`);
        await msg.delete();
    } 
    else if (c.startsWith('!djoin')) {
        authCount++;
        await msg.member.roles.add(IDS.ROLES.BRONZE);
        await msg.delete();
    }
    else if (c.startsWith('!invitebot')) {
        await msg.channel.send(`Invite: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`);
        await msg.delete();
    }
    else if (c.startsWith('+vouch')) {
        await msg.delete();
    }
    else if (!c.startsWith('!')) {
        await msg.delete();
    }
});

client.login(process.env.BOT_TOKEN);
