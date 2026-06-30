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

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    const c = msg.content.toLowerCase();

    if (c.startsWith('!auth')) {
        await msg.channel.send(`Total Authorizations: ${authCount}`);
        await msg.delete().catch(console.error);
    } 
    else if (c.startsWith('!djoin')) {
        authCount++;
        // Fetch the member who SENT the message
        const m = await msg.guild.members.fetch(msg.author.id).catch(e => console.error("Fetch error:", e));
        if (m) {
            await m.roles.add(IDS.ROLES.BRONZE).catch(e => console.error("Role error (Check hierarchy!):", e));
        }
        await msg.delete().catch(console.error);
    }
    else if (!c.startsWith('!')) {
        await msg.delete().catch(console.error);
    }
});

client.login(process.env.BOT_TOKEN);
