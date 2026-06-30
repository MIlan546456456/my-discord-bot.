require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials } = require('discord.js');
const mongoose = require('mongoose');

// --- DATABASE: Persistent Member Tracking ---
mongoose.connect(process.env.MONGODB_URI);
const Member = mongoose.model('Member', new mongoose.Schema({ id: String, joined: Boolean, verified: Boolean }));

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    VOUCH: '1521158198529364110',
    VERIFIED_ROLE: 'YOUR_ROLE_ID_HERE' // Add your role ID here
};

client.once('ready', async () => {
    console.log(`✅ Zynx Elite Engine Online: ${client.user.tag}`);
    client.user.setActivity('Member Services', { type: ActivityType.Watching });
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // 1. !djoin: The Funnel Entry (One-time DM Only)
    if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM) {
        let member = await Member.findOne({ id: msg.author.id });
        if (!member) {
            member = await Member.create({ id: msg.author.id, joined: true, verified: false });
            // This link is your authorization engine
            const authLink = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_CALLBACK_URL&scope=identify+guilds.join`;
            await msg.author.send(`👋 Welcome! Click to verify and gain access:\n${authLink}`).catch(() => {});
        }
        
        const reply = await msg.channel.send(`✅ Initialization complete for **${msg.author.username}**.`);
        await msg.delete().catch(() => {});
        setTimeout(() => reply.delete().catch(() => {}), 5000);
    }

    // 2. +vouch: The Trust Engine + Auto-Role
    if (msg.content.toLowerCase().startsWith('+vouch')) {
        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) {
            await vCh.send({ embeds: [new EmbedBuilder().setTitle('⭐ Trusted Member').setDescription(`Vouched by ${msg.author.tag}`).setColor(0x00FF00).setTimestamp()] });
        }
        
        // Auto-grant role
        const guildMember = await msg.guild.members.fetch(msg.author.id);
        if (IDS.VERIFIED_ROLE) await guildMember.roles.add(IDS.VERIFIED_ROLE).catch(() => {});
        
        await msg.delete().catch(() => {});
    }

    // 3. Auto-Prune: Keep the channel pristine
    if (msg.channel.id === IDS.FARM && !msg.content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
