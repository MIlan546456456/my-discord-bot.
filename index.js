require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel] 
});

mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ DB Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String, accessToken: String }));

const IDS = { ANNOUNCE: '1521300660988149980', FARM: '1520843854079852725', VOUCH: '1521158198529364110' };
const processing = new Set();
const cooldowns = new Map();

client.once('ready', async () => {
    client.user.setActivity('Zynx | Member Services', { type: ActivityType.Watching });
    const commands = [new SlashCommandBuilder().setName('restock').setDescription('Owner: Announce restock').addStringOption(o=>o.setName('product').setRequired(true)).addStringOption(o=>o.setName('price').setRequired(true))].map(c => c.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ Zynx Pro is Live: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (cooldowns.has(msg.author.id)) return;

    // !djoin with DM Handshake and Professional Cleanup
    if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM && !processing.has(msg.author.id)) {
        processing.add(msg.author.id);
        
        // Professional DM reminder as seen in image_661416.png
        await msg.author.send("👋 Hello! Please type `+vouch` in the server within 24h to avoid a ban/blacklist.").catch(() => console.log(`Failed to DM ${msg.author.tag}`));
        
        const count = await User.countDocuments();
        const reply = await msg.channel.send(`✅ Initializing join for **${count}** members.`);
        
        await msg.delete().catch(() => {});
        setTimeout(async () => { await reply.delete().catch(() => {}); processing.delete(msg.author.id); }, 5000);
        cooldowns.set(msg.author.id, true); setTimeout(() => cooldowns.delete(msg.author.id), 15000);
    }

    // Professional Vouching System
    if (msg.content.toLowerCase().startsWith('+vouch')) {
        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) {
            await vCh.send({ embeds: [new EmbedBuilder().setTitle('⭐ New Vouch!').setDescription(`Vouched by ${msg.author.tag}`).setColor(0xFFFF00).setTimestamp().setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })] });
        }
        await msg.delete().catch(() => {});
    }
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    if (!i.member.permissions.has('Administrator')) return i.reply({ content: '❌ No permission.', ephemeral: true });
    
    const product = i.options.getString('product');
    const embed = new EmbedBuilder().setTitle(`${product} Restocked!`).setDescription(`Our product **${product}** has been restocked!\n\n**Price:** ${i.options.getString('price')}\n**Status:** Available Now!`).setColor(0x800080).setTimestamp();
    
    await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
    await i.reply({ content: '✅ Restock announced!', ephemeral: true });
});

client.login(process.env.BOT_TOKEN);
