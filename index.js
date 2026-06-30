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

    // Use startsWith so it ignores the extra numbers you saw in image_8f88a0.png
    if (msg.content.startsWith('!djoin')) {
        authCount++;
        try {
            await msg.member.roles.add(IDS.ROLES.BRONZE);
            console.log("Successfully added role to: " + msg.author.username);
            await msg.delete();
        } catch (err) {
            console.error("CRITICAL ERROR: Could not add role. Details:", err);
        }
    } 
    else if (msg.content.startsWith('!auth')) {
        await msg.channel.send(`Total Authorizations: ${authCount}`);
        await msg.delete();
    }
    else if (!msg.content.startsWith('!')) {
        await msg.delete().catch(console.error);
    }
});

client.login(process.env.BOT_TOKEN);
