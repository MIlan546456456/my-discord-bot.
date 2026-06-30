require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

const app = express();
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

let authCount = 0; 
const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ROLES: { BRONZE: '1521612408823484688' }
};

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    console.log(`Command detected: ${msg.content}`); // Debug log

    const c = msg.content.toLowerCase();

    // Force reply for !auth
    if (c.startsWith('!auth')) {
        try {
            await msg.channel.send(`Total Authorizations: **${authCount}**`);
            console.log("Sent auth count");
            await msg.delete();
        } catch (e) { console.log("Error sending auth:", e); }
    } 
    // Force reply for !invitebot
    else if (c.startsWith('!invitebot')) {
        try {
            await msg.channel.send(`Invite: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot`);
            console.log("Sent invite");
            await msg.delete();
        } catch (e) { console.log("Error sending invite:", e); }
    }
    // !djoin
    else if (c.startsWith('!djoin')) {
        authCount++;
        if (msg.member) {
            await msg.member.roles.add(IDS.ROLES.BRONZE).catch(console.error);
            console.log("Added role for: " + msg.author.username);
        }
        await msg.delete().catch(console.error);
    }
    // Cleanup
    else if (!c.startsWith('!')) {
        await msg.delete().catch(console.error);
    }
});

client.login(process.env.BOT_TOKEN);
