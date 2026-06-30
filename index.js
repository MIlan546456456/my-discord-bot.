require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
app.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    console.log("BOT IS ONLINE AND READY");
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    
    console.log(`DEBUG: I see message: "${msg.content}"`);

    if (msg.content.toLowerCase().startsWith('!auth')) {
        console.log("DEBUG: Processing !auth command...");
        try {
            await msg.channel.send("Auth command received!");
            console.log("DEBUG: Response sent successfully.");
        } catch (err) {
            console.error("DEBUG: CRITICAL ERROR SENDING MESSAGE:", err);
        }
    }
});

client.login(process.env.BOT_TOKEN);
