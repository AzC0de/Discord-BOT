const { 
  Client, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionFlagsBits, 
  AttachmentBuilder,
  SelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile); 
const path = require('path');

module.exports = (client, config) => {
    client.on('interactionCreate', async interaction => {
        if (interaction.isButton()) {
            if (interaction.customId === 'close_ticket') {
			  const messages = await interaction.channel.messages.fetch({ limit: 100 });
			  const transcriptText = messages.reverse().map(message => `${message.author.tag}: ${message.content}`).join('\n');
			  const transcriptFileName = `transcript-${interaction.channel.id}.txt`;
			  const transcriptFilePath = path.join(__dirname, transcriptFileName);
			  await writeFile(transcriptFilePath, transcriptText);

			  const transcriptFile = new AttachmentBuilder(transcriptFilePath);

			  const transcriptChannel = client.channels.cache.get(config.transcriptChannelId);
			  transcriptChannel.send({
				  content: `Transcript for ticket: ${interaction.channel.name}`,
				  files: [transcriptFile]
			  });

			  if (config.sendTranscriptToUser) {
				interaction.user.send({
				  content: 'Here is the transcript of your ticket.',
				  files: [transcriptFile]
				}).catch(e => console.error('Error sending DM to user: ', e));
			  }

			  interaction.channel.delete().catch(e => console.error('Error deleting ticket channel: ', e));
            } else if (interaction.customId === 'claim_ticket') {
                if (interaction.member.roles.cache.has(config.supportRoleId)) {
                } else {
                    interaction.reply({ 
                        content: 'You do not have permission to claim this ticket.',
                        ephemeral: true
                    });
                }
            }
        }

	if (interaction.isSelectMenu()) {
	  if (interaction.customId === 'ticket_menu') {
	  const ticketType = interaction.values[0];
	  const ticketTypeInfo = config.ticketTypes.find(t => t.name === ticketType);
	  const guild = interaction.guild;

	  guild.channels.create({
		name: `${ticketType.split(' ').join('-')} | ${interaction.user.username.split('#')[0]}`,
		type: ChannelType.GuildText,
		parent: ticketTypeInfo.category,
		permissionOverwrites: [
		  {
			id: guild.id,
			deny: [PermissionFlagsBits.ViewChannel],
		  },
		  {
			id: interaction.user.id,
			allow: [PermissionFlagsBits.ViewChannel],
		  },
		  ...ticketTypeInfo.supportRoleIds.map(roleId => ({ 
			id: roleId,
			allow: [PermissionFlagsBits.ViewChannel],
		  })),
		],
		}).then(async ticketChannel => {
		  let rolesToMention = ticketTypeInfo.mentionRoleIds.map(roleId => `<@&${roleId}>`).join(' ');
		  await ticketChannel.send(rolesToMention);

			const initialTicketEmbed = new EmbedBuilder()
			  .setColor(config.initialTicketEmbed.color)
			  .setTitle(`${ticketTypeInfo.name}`)
			  .setDescription(config.initialTicketEmbed.welcomeText.join('\n').replace('{{user}}', `<@${interaction.user.id}>`))
			  .setFooter({ text: config.initialTicketEmbed.footer })
			  .setTimestamp();

		  const closeTicketButton = new ButtonBuilder()
			.setCustomId('close_ticket')
			.setLabel(config.buttons.close.label)
			.setStyle(ButtonStyle.Danger)
			.setEmoji(config.buttons.close.emoji);

		  const claimTicketButton = new ButtonBuilder()
			.setCustomId('claim_ticket')
			.setLabel(config.buttons.claim.label)
			.setStyle(ButtonStyle.Success)
			.setEmoji(config.buttons.claim.emoji);

		  const buttonRow = new ActionRowBuilder().addComponents(closeTicketButton, claimTicketButton);

		  await ticketChannel.send({ 
			embeds: [initialTicketEmbed], 
			components: [buttonRow] 
		  });

		  await interaction.reply({
			content: `Ticket created: <#${ticketChannel.id}>`,
			ephemeral: true
		  });
		}).catch(console.error);
	  }
	}

});

	client.on('messageCreate', async message => {
	  if (message.content === '!setticket' && message.author.id === config.ownerId) {
		const imagePath = path.join(__dirname, '..', 'images', 'ticket.png');
		if (!fs.existsSync(imagePath)) {
		  return message.reply('The image file is not found on the server.');
		}

		const imageAttachment = new AttachmentBuilder(imagePath);

		const menu = new SelectMenuBuilder()
		  .setCustomId('ticket_menu')
		  .setPlaceholder(config.placeholder)
		  .addOptions(config.ticketTypes.map(t => ({
			label: t.name,
			description: t.description,
			value: t.name,
			emoji: t.emoji
		  })));

		const row = new ActionRowBuilder().addComponents(menu);

		const ticketEmbed = new EmbedBuilder()
		  .setColor(config.ticketEmbed.color)
		  .setTitle(config.ticketEmbed.title)
		  .setDescription(config.ticketEmbed.description.join('\n'))
		  .setThumbnail('attachment://ticket.png');

		if (config.ticketEmbed.timestamp) {
		  ticketEmbed.setTimestamp();
		}

		await message.channel.send({ 
		  embeds: [ticketEmbed], 
		  components: [row], 
		  files: [imageAttachment] 
		});
	  }
	});

};