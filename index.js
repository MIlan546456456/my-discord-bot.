require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const express = require('express');

const app = express();
app.listen(process.env.PORT || 3000);
const db = new QuickDB(); 

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel, Partials.Message] 
});

const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    ROLES: { BRONZE: '1521612408823484688' }
};

client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (msg.channel.id !== IDS.FARM && msg.channel.id !== IDS.FREE_BRONZE) return;

    const c = msg.content.toLowerCase();

    // !djoin: Save user ID to database list
    if (c.startsWith('!djoin')) {
        let authList = await db.get("authUsers") || [];
        
        // Only add if they haven't authorized already
        if (!authList.includes(msg.author.id)) {
            authList.push(msg.author.id);
            await db.set("authUsers", authList);
            if (msg.member) await msg.member.roles.add(IDS.ROLES.BRONZE).catch(() => {});
        }
        await msg.delete().catch(() => {});
    } 

    // !auth: Show Total Count AND a preview of who authorized
    else if (c.startsWith('!auth')) {
        let authList = await db.get("authUsers") || [];
        const count = authList.length;
        
        // Get the last 5 users who authorized
        const recent = authList.slice(-5).map(id => `<@${id}>`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle("📊 Zynx Authorization Stats")
            .setColor(0x800080)
            .addFields(
                { name: "Total Authorizations", value: `**${count}**`, inline: true },
                { name: "Recent Authorizations", value: recent || "No data yet." }
            )
            .setTimestamp();
        
        await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(() => {});
    }
    
    // ... rest of your existing commands (invite, vouch, etc) ...
});

client.login(process.env.BOT_TOKEN);
