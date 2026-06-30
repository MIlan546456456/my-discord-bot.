require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    VOUCH: '1521158198529364110',
    ANNOUNCE: '1521300660988149980',
    BRONZE_ROLE: 'YOUR_BRONZE_ID', 
    VERIFIED_ROLE: 'YOUR_VERIFIED_ID' 
};

// --- STABLE STARTUP ---
async function init() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database Ready.");
        await client.login(process.env.BOT_TOKEN);
    } catch (err) {
        console.error("Failed to start:", err);
    }
}

client.once('ready', async () => {
    const commands = [new SlashCommandBuilder().setName('restock').setDescription('Restock').addStringOption(o=>o.setName('product').setRequired(true)).addStringOption(o=>o.setName('price').setRequired(true))].map(c => c.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Zynx Online: ${client.user.tag}`);
});

// --- COMMAND EXECUTION WITH ERROR PROTECTION ---
client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    try {
        // !auth
        if (msg.content.toLowerCase().startsWith('!auth') && msg.channel.id === IDS.FARM) {
            const guildMember = await msg.guild.members.fetch(msg.author.id);
            await guildMember.roles.add(IDS.BRONZE_ROLE).catch(() => {});
            await msg.author.send(`Welcome. Bronze access granted.\nhttps://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_URL&scope=identify+guilds.join`).catch(() => {});
            await msg.delete().catch(() => {});
        }
        // !djoin
        else if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM) {
            const guildMember = await msg.guild.members.fetch(msg.author.id);
            await guildMember.roles.add(IDS.BRONZE_ROLE).catch(() => {});
            await msg.delete().catch(() => {});
        }
        // +vouch
        else if (msg.content.toLowerCase().startsWith('+vouch')) {
            const guildMember = await msg.guild.members.fetch(msg.author.id);
            await guildMember.roles.add(IDS.VERIFIED_ROLE).catch(() => {});
            await guildMember.roles.remove(IDS.BRONZE_ROLE).catch(() => {});
            await msg.delete().catch(() => {});
        }
        // Auto-Prune
        else if (msg.channel.id === IDS.FARM && !msg.content.startsWith('!')) {
            await msg.delete().catch(() => {});
        }
    } catch (err) {
        console.error("Command Error:", err);
    }
});

init();
