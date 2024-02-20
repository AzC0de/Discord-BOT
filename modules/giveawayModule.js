const { 
  Client, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ChannelType, 
  PermissionFlagsBits, 
  MessageActionRow, 
  MessageButton, 
  MessageCollector, 
  PermissionsBitField,
  GatewayIntentBits 
} = require('discord.js');
const ms = require('ms');

module.exports = (client, config) => {
client.on('messageCreate', async message => {
  if (message.content === '!giveaway' && message.author.id === config.ownerId) {
    const filter = m => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({ filter, time: 60000 });
    const giveawayInfo = {
      channel: null,
      title: '',
      description: '',
      duration: '',
      thumbnail: null,
      image: null
    };
    
    let step = 0;
    message.channel.send(config.giveaway.questions.channel);

    collector.on('collect', m => {
      step++;
      switch (step) {
        case 1:
          giveawayInfo.channel = m.mentions.channels.first();
          if (!giveawayInfo.channel) {
            message.channel.send('No valid channel has been mentioned. Try again.');
            step--;
          } else {
            message.channel.send(config.giveaway.questions.title);
          }
          break;
        case 2:
          giveawayInfo.title = m.content;
          message.channel.send(config.giveaway.questions.description);
          break;
        case 3:
          giveawayInfo.description = m.content;
          message.channel.send(config.giveaway.questions.duration);
          break;
        case 4:
          giveawayInfo.duration = ms(m.content);
          if (!giveawayInfo.duration) {
            message.channel.send('Invalid time format. Try again.');
            step--;
          } else {
            message.channel.send(config.giveaway.questions.thumbnail);
          }
          break;
        case 5:
          if (m.attachments.size > 0) {
            giveawayInfo.thumbnail = m.attachments.first().url;
            message.channel.send(config.giveaway.questions.image);
          } else if (m.content.toLowerCase() === 'no') {
            message.channel.send(config.giveaway.questions.image);
          } else {
            message.channel.send('No valid image submitted or no response \'No\'. Try again.');
            step--;
          }
          break;
        case 6:
          if (m.attachments.size > 0) {
            giveawayInfo.image = m.attachments.first().url;
          } else if (m.content.toLowerCase() !== 'no') {
            message.channel.send('No valid image submitted or no response \'No\'. Try again.');
            step--;
          }
          collector.stop(); 
          break;
      }
    });

    collector.on('end', collected => {
      if (collected.size < 6) {
        message.channel.send('Not all necessary responses were received.');
        return;
      }
      const giveawayEmbed = new EmbedBuilder()
        .setColor(config.giveaway.giveawayEmbed.color)
        .setTitle(giveawayInfo.title)
        .setDescription(giveawayInfo.description)
        .setFooter({ text: config.giveaway.giveawayEmbed.footer })
        .setTimestamp(Date.now() + giveawayInfo.duration);

      if (giveawayInfo.thumbnail) {
        giveawayEmbed.setThumbnail(giveawayInfo.thumbnail);
      }
      if (giveawayInfo.image) {
        giveawayEmbed.setImage(giveawayInfo.image);
      }

      giveawayInfo.channel.send({ embeds: [giveawayEmbed] }).then(giveawayMessage => {
        giveawayMessage.react('🎉');
        setTimeout(() => {
          giveawayMessage.reactions.resolve('🎉').users.fetch().then(users => {
            const eligibleUsers = users.filter(u => !u.bot && u.id !== client.user.id);
            if (eligibleUsers.size === 0) {
              giveawayInfo.channel.send(config.giveaway.noParticipantsMessage);
              return;
            }
            const winner = eligibleUsers.random();
            giveawayInfo.channel.send(config.giveaway.winnerAnnouncement.replace('{winner}', winner));
          });
        }, giveawayInfo.duration);
      });
    });
  }
});
};
