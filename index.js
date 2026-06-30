require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

const app = express();
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ROLES: { BRONZE: '1521612408823484688' }
};

let authCount = 0;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
    // Stop if it's a bot or wrong channel
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    console.log(`Bot saw: ${msg.content}`); // Check Render Logs for this!

    const c = msg.content.toLowerCase();

    if (c === '!auth') {
        await msg.channel.send(`Total Authorizations: ${authCount}`);
        await msg.delete().catch(console.error);
    } 
    else if (c === '!djoin') {
        authCount++;
        const m = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        if (m) await m.roles.add(IDS.ROLES.BRONZE).catch(console.error);
        await msg.delete().catch(console.error);
    }
    else if (!c.startsWith('!')) {
        await msg.delete().catch(console.error);
    }
});

client.login(process.env.BOT_TOKEN);
