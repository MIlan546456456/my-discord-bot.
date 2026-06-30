require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    BRONZE_ROLE: 'YOUR_BRONZE_ID_HERE', 
    VERIFIED_ROLE: 'YOUR_VERIFIED_ID_HERE' 
};

client.once('ready', () => {
    console.log(`✅ Zynx Engine Online: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // 1. !djoin: Grant Bronze role immediately
    if (msg.content.toLowerCase().startsWith('!djoin') && msg.channel.id === IDS.FARM) {
        try {
            const guildMember = await msg.guild.members.fetch(msg.author.id);
            await guildMember.roles.add(IDS.BRONZE_ROLE).catch(() => {});
            
            const reply = await msg.channel.send(`✅ Access granted for **${msg.author.username}**.`);
            await msg.delete().catch(() => {});
            
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        } catch (err) {
            console.error("Error in !djoin:", err);
        }
        return;
    }

    // 2. +vouch: Upgrade to Verified role
    if (msg.content.toLowerCase().startsWith('+vouch')) {
        try {
            const guildMember = await msg.guild.members.fetch(msg.author.id);
            await guildMember.roles.add(IDS.VERIFIED_ROLE).catch(() => {});
            await msg.delete().catch(() => {});
        } catch (err) {
            console.error("Error in +vouch:", err);
        }
        return;
    }

    // 3. Auto-Prune: Keep #farm pristine
    if (msg.channel.id === IDS.FARM && !msg.content.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
