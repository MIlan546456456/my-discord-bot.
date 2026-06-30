require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

// --- GLOBAL ERROR HANDLING (Prevents crashes/timeouts) ---
process.on('unhandledRejection', (err) => console.error(err));
process.on('uncaughtException', (err) => console.error(err));

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

// --- IDs ---
const IDS = { 
    FARM: '1520843854079852725', 
    ANNOUNCE: '1521300660988149980',
    BRONZE: '1520843854079852725' 
};

client.on('error', (err) => console.error('Client Error:', err));

client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('restock').setDescription('Announce').addStringOption(o=>o.setName('product').setRequired(true)).addStringOption(o=>o.setName('price').setRequired(true))
    ].map(c => c.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Zynx Engine Online.`);
});

client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'restock') {
        const embed = new EmbedBuilder().setTitle(`🔥 ${i.options.getString('product')} Restocked!`).setDescription(`Price: ${i.options.getString('price')}`).setColor(0x800080);
        await client.channels.cache.get(IDS.ANNOUNCE).send({ content: '@everyone', embeds: [embed] });
        await i.reply({ content: 'Done.', ephemeral: true });
    }
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // Command Logic
    if (msg.channel.id === IDS.FARM) {
        // !auth
        if (msg.content.toLowerCase().startsWith('!auth')) {
            const member = await msg.guild.members.fetch(msg.author.id);
            await member.roles.add(IDS.BRONZE).catch(() => {});
            await msg.author.send(`Bronze access granted: https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&response_type=code&redirect_uri=YOUR_URL&scope=identify+guilds.join`).catch(() => {});
            await msg.delete().catch(() => {});
        } 
        // !djoin
        else if (msg.content.toLowerCase().startsWith('!djoin')) {
            const member = await msg.guild.members.fetch(msg.author.id);
            await member.roles.add(IDS.BRONZE).catch(() => {});
            await msg.delete().catch(() => {});
        } 
        // +vouch (Included as requested, only applies role)
        else if (msg.content.toLowerCase().startsWith('+vouch')) {
            await msg.delete().catch(() => {});
        }
        // Cleanup: Prune everything else
        else if (!msg.content.startsWith('!')) {
            await msg.delete().catch(() => {});
        }
    }
});

client.login(process.env.BOT_TOKEN);
