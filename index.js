require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType } = require('discord.js');
const { QuickDB } = require('quick.db');
const express = require('express');

const app = express();
app.listen(process.env.PORT || 3000);
const db = new QuickDB();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message] 
});

// FULLY SYNCED IDs FROM OUR HISTORY
const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ANNOUNCE: '1521300660988149980',
    ROLES: { 
        BRONZE: '1521612408823484688' 
    }
};

client.once('ready', () => {
    console.log(`Zynx Engine fully synchronized and Online: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    
    // Listening in both FARM and FREE_BRONZE
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    const c = msg.content.toLowerCase();

    // !djoin: Persistent Registration
    if (c.startsWith('!djoin')) {
        let authList = await db.get("authUsers") || [];
        if (!authList.includes(msg.author.id)) {
            authList.push(msg.author.id);
            await db.set("authUsers", authList);
            if (msg.member) await msg.member.roles.add(IDS.ROLES.BRONZE).catch(() => {});
        }
        await msg.delete().catch(() => {});
    } 
    // !auth: Stats Dashboard
    else if (c.startsWith('!auth')) {
        let authList = await db.get("authUsers") || [];
        const recent = authList.slice(-5).map(id => `<@${id}>`).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle("📊 Zynx Authorization Stats")
            .setColor(0x800080)
            .addFields(
                { name: "Total Authorizations", value: `**${authList.length}**`, inline: true },
                { name: "Recent Users", value: recent || "No data yet." }
            )
            .setTimestamp();
        
        await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(() => {});
    }
    // !invitebot: Professional Embed
    else if (c.startsWith('!invitebot')) {
        const embed = new EmbedBuilder()
            .setTitle("🤖 Add Bot to Your Server")
            .setDescription("For `!djoin` to work, the bot **must** be in the target server.")
            .setColor(0x800080)
            .addFields(
                { name: "👉 Click here to invite the bot", value: `[Invite Link](https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot)` },
                { name: "Steps", value: "1. Click the link above\n2. Select your server\n3. Click Authorize" }
            )
            .setFooter({ text: "⚠ If the bot is not in the target server, !djoin will fail." });
        await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(() => {});
    }
    // Cleanup & Vouch
    else if (c.startsWith('+vouch') || !c.startsWith('!')) {
        await msg.delete().catch(() => {});
    }
});

client.login(process.env.BOT_TOKEN);
