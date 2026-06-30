require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message] 
});

// Database Setup
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ DB Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String }));

// Channel IDs
const IDS = { 
    ANNOUNCE: '1521300660988149980', 
    FARM: '1520843854079852725', 
    VOUCH: '1521158198529364110' 
};

// Anti-Spam Locks
const activeProcessing = new Set();
const userCooldowns = new Map();

client.once('ready', async () => {
    console.log(`✅ Zynx Elite Online: ${client.user.tag}`);
    client.user.setActivity('Member Services', { type: ActivityType.Watching });

    // Register Slash Command
    const commands = [
        new SlashCommandBuilder()
            .setName('restock')
            .setDescription('Owner: Announce a product restock')
            .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
            .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // !djoin Logic (Strictly locked to prevent spam)
    if (msg.content.toLowerCase().startsWith('!djoin')) {
        if (msg.channel.id !== IDS.FARM || activeProcessing.has(msg.author.id)) return;
        
        activeProcessing.add(msg.author.id);
        
        // Professional DM Warning (Requirement from image_661416.png)
        await msg.author.send("👋 Hello! Please type `+vouch` in the server within 24h to avoid a ban/blacklist.").catch(() => {});
        
        const count = await User.countDocuments();
        const reply = await msg.channel.send(`✅ Initializing join for **${count}** members.`);
        
        // Cleanup protocol
        await msg.delete().catch(() => {});
        setTimeout(async () => {
            await reply.delete().catch(() => {});
            activeProcessing.delete(msg.author.id);
        }, 5000);
    }

    // +vouch Logic
    if (msg.content.toLowerCase().startsWith('+vouch')) {
        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) {
            const embed = new EmbedBuilder()
                .setTitle('⭐ New Vouch!')
                .setDescription(`User **${msg.author.tag}** has vouched!`)
                .setColor(0xFFFF00)
                .setTimestamp()
                .setFooter({ text: 'Zynx Professional Audit' });
            await vCh.send({ embeds: [embed] });
        }
        await msg.delete().catch(() => {});
    }
});

// Slash Command Handler (/restock)
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    
    if (!i.member.permissions.has('Administrator')) {
        return i.reply({ content: '❌ Access denied.', ephemeral: true });
    }

    const prod = i.options.getString('product');
    const price = i.options.getString('price');
    
    const embed = new EmbedBuilder()
        .setTitle(`${prod} Restocked!`)
        .setDescription(`Our product **${prod}** has been restocked!\n\n**Price:** ${price}\n**Status:** Available Now!`)
        .setColor(0x800080)
        .setTimestamp()
        .setFooter({ text: 'Zynx Restock Notification' });

    await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
    await i.reply({ content: '✅ Restock announced!', ephemeral: true });
});

client.login(process.env.BOT_TOKEN);
app.listen(3000);
