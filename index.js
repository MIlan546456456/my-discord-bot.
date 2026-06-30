require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel, Partials.Message] 
});

client.on('error', (err) => console.error('❌ Discord Client Error:', err));
process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));

mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ DB Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String }));

const IDS = { ANNOUNCE: '1521300660988149980', FARM: '1520843854079852725', VOUCH: '1521158198529364110' };

client.once('ready', async () => {
    console.log(`✅ Zynx Elite Online: ${client.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('restock').setDescription('Owner: Announce a restock')
            .addStringOption(o => o.setName('product').setRequired(true))
            .addStringOption(o => o.setName('price').setRequired(true))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // !auth command
    if (msg.content.toLowerCase().startsWith('!auth')) {
        const authLink = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_REDIRECT_URL&scope=identify+guilds.join`;
        const embed = new EmbedBuilder()
            .setTitle('🔒 Secure Authorization')
            .setDescription(`Click below to verify your account:\n[Click Here to Authorize](${authLink})`)
            .setColor(0x00AAFF);
        await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(() => {});
    }

    // !djoin & +vouch logic...
    if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM) {
        await msg.author.send("👋 Hello! Please type `+vouch` in the server within 24h.").catch(() => {});
        const reply = await msg.channel.send(`✅ Initializing join.`);
        await msg.delete().catch(() => {});
        setTimeout(async () => await reply.delete().catch(() => {}), 5000);
    }

    if (msg.content.toLowerCase().startsWith('+vouch')) {
        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) await vCh.send({ embeds: [new EmbedBuilder().setTitle('⭐ New Vouch!').setDescription(`Vouched by ${msg.author.tag}`).setColor(0xFFFF00).setTimestamp()] });
        await msg.delete().catch(() => {});
    }
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    if (!i.member.permissions.has('Administrator')) return i.reply({ content: '❌', ephemeral: true });
    
    const embed = new EmbedBuilder().setTitle(`${i.options.getString('product')} Restocked!`)
        .setDescription(`**Price:** ${i.options.getString('price')}\n**Status:** Available Now!`).setColor(0x800080);
    await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
    await i.reply({ content: '✅', ephemeral: true });
});

client.login(process.env.BOT_TOKEN);
const app = express();
app.listen(process.env.PORT || 3000);
