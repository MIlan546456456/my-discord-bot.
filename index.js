require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel, Partials.Message] 
});

// --- GLOBAL ERROR HANDLERS (Fixes image_6623bc.png & image_6623f2.png) ---
client.on('error', (err) => console.error('❌ Discord Client Error:', err));
process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));

mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ DB Connected"));
const User = mongoose.model('User', new mongoose.Schema({ id: String }));

const IDS = { ANNOUNCE: '1521300660988149980', FARM: '1520843854079852725', VOUCH: '1521158198529364110' };
const activeProcessing = new Set();

client.once('ready', async () => {
    console.log(`✅ Zynx Elite Online: ${client.user.tag}`);
    client.user.setActivity('Member Services', { type: ActivityType.Watching });

    const commands = [
        new SlashCommandBuilder()
            .setName('restock')
            .setDescription('Owner: Announce a restock')
            .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
            .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // !djoin: DM warning + Auto-Cleanup
    if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM && !activeProcessing.has(msg.author.id)) {
        activeProcessing.add(msg.author.id);
        await msg.author.send("👋 Hello! Please type `+vouch` in the server within 24h to avoid a ban/blacklist.").catch(() => {});
        const count = await User.countDocuments();
        const reply = await msg.channel.send(`✅ Initializing join for **${count}** members.`);
        await msg.delete().catch(() => {});
        setTimeout(async () => { await reply.delete().catch(() => {}); activeProcessing.delete(msg.author.id); }, 5000);
    }

    // +vouch: Logging + Auto-Cleanup
    if (msg.content.toLowerCase().startsWith('+vouch')) {
        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) await vCh.send({ embeds: [new EmbedBuilder().setTitle('⭐ New Vouch!').setDescription(`Vouched by ${msg.author.tag}`).setColor(0xFFFF00).setTimestamp()] });
        await msg.delete().catch(() => {});
    }
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() || i.commandName !== 'restock') return;
    if (!i.member.permissions.has('Administrator')) return i.reply({ content: '❌ No permission.', ephemeral: true });
    
    const embed = new EmbedBuilder()
        .setTitle(`${i.options.getString('product')} Restocked!`)
        .setDescription(`Our product **${i.options.getString('product')}** has been restocked!\n\n**Price:** ${i.options.getString('price')}\n**Status:** Available Now!`)
        .setColor(0x800080).setTimestamp();
    
    await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
    await i.reply({ content: '✅ Restock announced!', ephemeral: true });
});

client.login(process.env.BOT_TOKEN);
const app = express();
app.listen(process.env.PORT || 3000);
