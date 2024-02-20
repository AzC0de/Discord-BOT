const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const yaml = require('js-yaml');
const supportChannelModule = require('./modules/supportChannel.js');
const ticketModule = require('./modules/ticketModule.js');
const giveawayModule = require('./modules/giveawayModule.js');
const changelogModule = require('./modules/changelogModule.js');
let config = {};
try {
    config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
} catch (e) {
    console.error('Error reading config.yml file:', e);
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent 
    ]
});

const ownerId = config.ownerId;
const welcomeChannelId = config.welcomeChannelId;

client.once('ready', () => {
    console.log('Bot is online!');
});

try {
    supportChannelModule(client, config);
    console.log('Support channel module loaded correctly.');
} catch (e) {
    console.error('Error loading support channel module:', e);
}

try {
    ticketModule(client, config);
    console.log('Ticket module loaded correctly.');
} catch (e) {
    console.error('Error loading ticket module:', e);
}
try {
    giveawayModule(client, config);
    console.log('Giveaway module loaded correctly.');
} catch (e) {
    console.error('Error loading the giveaway module:', e);
}
try {
    changelogModule(client, config);
    console.log('Changelog module loaded correctly.');
} catch (e) {
    console.error('Error loading changelog module:', e);
}
client.login(config.token);
