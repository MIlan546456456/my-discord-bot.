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

// UPDATED WITH YOUR CLIENT ID
const CLIENT_ID = '1520836537317855402'; 

const IDS = { 
    FARM: '1520843854079852725', 
    FREE_BRONZE: '1521199552990806156',
    AUTHORIZE: '1521666699106091048',
    ROLES: { BRONZE: '1521612408823484688' }
};

client.once('ready', () => {
    console.log(`Zynx Engine is Online: ${client.user.tag}`);
    client.user.setActivity('Free members', { type: ActivityType.Watching });
});

client.on('messageCreate', async (msg) => {
    // DEBUG: This will show in Render Logs
    console.log(`DEBUG: Message received from ${msg.author.username} in channel ${msg.channel.id}: "${msg.content}"`);

    if (msg.author.bot || !msg.guild) return;
    
    // Check if channel is authorized
    const isValidChannel = [IDS.FARM, IDS.FREE_BRONZE, IDS.AUTHORIZE].includes(msg.channel.id);
    if (!isValidChannel) return;

    const c = msg.content.toLowerCase();

    if (c.startsWith('!djoin')) {
        let authList = await db.get("authUsers") || [];
        if (!authList.includes(msg.author.id)) {
            authList.push(msg.author.id);
            await db.set("authUsers", authList);
            if (msg.member) await msg.member.roles.add(IDS.ROLES.BRONZE).catch(console.error);
        }
        await msg.delete().catch(console.error);
    } 
    else if (c.startsWith('!auth')) {
        let authList = await db.get("authUsers") || [];
        const embed = new EmbedBuilder()
            .setTitle("📊 Zynx Authorization Stats")
            .setColor(0x800080)
            .setDescription(`Total successful authorizations: **${authList.length}**`)
            .setFooter({ text: "This message will self-destruct in 5 seconds." })
            .setTimestamp();
        
        const reply = await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(console.error);
        setTimeout(() => reply.delete().catch(console.error), 5000);
    }
    else if (c.startsWith('!invitebot')) {
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot`;
        const embed = new EmbedBuilder()
            .setTitle("🤖 Add Zynx to Your Server")
            .setColor(0x800080)
            .setDescription(`[Click here to invite the bot](${inviteUrl})`)
            .setTimestamp();
        await msg.channel.send({ embeds: [embed] });
        await msg.delete().catch(console.error);
    }
    else if (c.startsWith('!clear')) {
        if (msg.member.permissions.has('Administrator')) {
            const fetched = await msg.channel.messages.fetch({ limit: 100 });
            await msg.channel.bulkDelete(fetched).catch(console.error);
        }
    }
    else if (!c.startsWith('!') && !c.startsWith('+vouch')) {
        await msg.delete().catch(console.error);
    }
});

client.login(process.env.BOT_TOKEN);
