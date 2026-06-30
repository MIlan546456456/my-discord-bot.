require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    ANNOUNCE: '1521300660988149980',
    BRONZE: '1520843854079852725' 
};

// 1. Silent error handling to prevent the crash seen in image_74a475.png
client.on('error', (err) => console.error('Discord Client Error (Ignored):', err.message));

client.once('ready', async () => {
    console.log(`Zynx Engine Online.`);
    
    // 2. Isolated Registration - Failure here will NOT crash the bot
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('restock')
                .setDescription('Announce a restock')
                .addStringOption(o => o.setName('product').setDescription('Product name').setRequired(true))
                .addStringOption(o => o.setName('price').setDescription('Price').setRequired(true))
        ].map(c => c.toJSON());
        
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (err) {
        console.error("Slash Command Registration Error:", err.message);
    }
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'restock') {
        const embed = new EmbedBuilder()
            .setTitle(`🔥 ${i.options.getString('product')} Restocked!`)
            .setDescription(`Price: ${i.options.getString('price')}`)
            .setColor(0x800080);
        await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
        await i.reply({ content: 'Done.', ephemeral: true });
    }
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM) return;

    if (msg.content.toLowerCase().startsWith('!auth')) {
        const member = await msg.guild.members.fetch(msg.author.id);
        await member.roles.add(IDS.BRONZE).catch(() => {});
        await msg.author.send(`Bronze access granted: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_URL&scope=identify+guilds.join`).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    else if (msg.content.toLowerCase().startsWith('!djoin')) {
        const member = await msg.guild.members.fetch(msg.author.id);
        await member.roles.add(IDS.BRONZE).catch(() => {});
        await msg.delete().catch(() => {});
    } 
    else if (msg.content.toLowerCase().startsWith('+vouch')) {
        await msg.delete().catch(() => {});
    }
    else if (!msg.content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
