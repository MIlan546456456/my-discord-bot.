require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');

// --- DATABASE: Persistent tracking ---
mongoose.connect(process.env.MONGODB_URI);
const Member = mongoose.model('Member', new mongoose.Schema({ id: String }));

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

// Slash Commands
client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('restock').setDescription('Announce a restock')
            .addStringOption(o => o.setName('product').setRequired(true))
            .addStringOption(o => o.setName('price').setRequired(true))
    ].map(c => c.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ Zynx Engine Online.`);
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'restock') {
        const embed = new EmbedBuilder().setTitle(`🔥 ${i.options.getString('product')} Restocked!`)
            .setDescription(`**Price:** ${i.options.getString('price')}\n**Status:** Available Now!`).setColor(0x800080);
        await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
        await i.reply({ content: '✅ Announcement sent.', ephemeral: true });
    }
});

// Command Handling
client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // 1. !auth: Link + Bronze Grant
    if (msg.content.toLowerCase().startsWith('!auth') && msg.channel.id === IDS.FARM) {
        let member = await Member.findOne({ id: msg.author.id });
        if (!member) {
            await Member.create({ id: msg.author.id });
            const guildMember = await msg.guild.members.fetch(msg.author.id);
            await guildMember.roles.add(IDS.BRONZE_ROLE).catch(() => {});
            await msg.author.send(`👋 Welcome. You've been granted **Bronze Access**.\nhttps://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_URL&scope=identify+guilds.join`).catch(() => {});
        }
        await msg.delete().catch(() => {});
    }

    // 2. !djoin: Grant Bronze
    if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM) {
        const guildMember = await msg.guild.members.fetch(msg.author.id);
        await guildMember.roles.add(IDS.BRONZE_ROLE).catch(() => {});
        const reply = await msg.channel.send(`✅ Bronze Access granted.`);
        await msg.delete().catch(() => {});
        setTimeout(() => reply.delete().catch(() => {}), 3000);
    }

    // 3. +vouch: Upgrade to Verified
    if (msg.content.toLowerCase().startsWith('+vouch')) {
        const guildMember = await msg.guild.members.fetch(msg.author.id);
        await guildMember.roles.add(IDS.VERIFIED_ROLE).catch(() => {});
        await guildMember.roles.remove(IDS.BRONZE_ROLE).catch(() => {});
        const vCh = msg.guild.channels.cache.get(IDS.VOUCH);
        if (vCh) await vCh.send({ embeds: [new EmbedBuilder().setTitle('⭐ Trusted').setDescription(`${msg.author.tag} is now Verified.`).setColor(0x00FF00)] });
        await msg.delete().catch(() => {});
    }

    // 4. Auto-Prune (Delete non-commands)
    if (msg.channel.id === IDS.FARM && !msg.content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
