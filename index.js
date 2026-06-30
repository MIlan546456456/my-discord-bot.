require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`--- BOT IS ONLINE AND CONNECTED AS ${client.user.tag} ---`);
});

client.on('messageCreate', (msg) => {
    // This logs every single message the bot sees
    console.log(`DEBUG: I saw a message in channel ${msg.channel.id}: "${msg.content}"`);
});

client.login(process.env.BOT_TOKEN);
