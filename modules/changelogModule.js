const { Client, EmbedBuilder, MessageCollector, AttachmentBuilder } = require('discord.js');

module.exports = (client, config) => {
  client.on('messageCreate', async message => {
    if (message.content === '!changelog' && message.author.id === config.ownerId) {
      const changelogInfo = {};

      const askQuestion = async (question) => {
        await message.channel.send(question);
        const collected = await message.channel.awaitMessages({ max: 1, time: 60000 });
        const response = collected.first()?.content || 'No';
        return response.toLowerCase() !== 'no' ? response.split('\n').map(line => `- ${line}`).join('\n') : response;
      };

      changelogInfo.date = await askQuestion(config.changelog.questions.date);
      changelogInfo.added = await askQuestion(config.changelog.questions.added);
      changelogInfo.changed = await askQuestion(config.changelog.questions.changed);
      changelogInfo.overheads = await askQuestion(config.changelog.questions.overheads);
      changelogInfo.signature = await askQuestion(config.changelog.questions.signature);

      const imageAttachment = new AttachmentBuilder('./images/welcome.png', { name: 'image.png' });
      const thumbnailAttachment = new AttachmentBuilder('./images/thumbnail.png', { name: 'thumbnail.png' });

      const changelogEmbed = new EmbedBuilder()
        .setColor(config.changelog.color)
        .setTitle(`${config.changelog.title}`)
        .setDescription(`Changelog of ${changelogInfo.date}`)
        .setFooter({ text: config.changelog.footer })
        .setTimestamp()
        .setImage('attachment://image.png')
        .setThumbnail('attachment://thumbnail.png');

      if (changelogInfo.added.toLowerCase() !== 'no') {
        changelogEmbed.addFields({ name: config.changelog.sections.added, value: changelogInfo.added });
      }
      if (changelogInfo.changed.toLowerCase() !== 'no') {
        changelogEmbed.addFields({ name: config.changelog.sections.changed, value: changelogInfo.changed });
      }
      if (changelogInfo.overheads.toLowerCase() !== 'no') {
        changelogEmbed.addFields({ name: config.changelog.sections.overheads, value: changelogInfo.overheads });
      }
      if (changelogInfo.signature.toLowerCase() !== 'no') {
        changelogEmbed.addFields({ name: config.changelog.sections.signature, value: changelogInfo.signature });
      }

      const changelogChannel = client.channels.cache.get(config.changelog.channelId);
      if (!changelogChannel) {
        return message.channel.send('The specified channel for the changelog was not found.');
      }

      changelogChannel.send({
        embeds: [changelogEmbed],
        files: [imageAttachment, thumbnailAttachment]
      });
    }
  });
};
