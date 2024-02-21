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
const moment = require('moment');
const db = require('./database.js');

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
    const channelId = interaction.channel.id;
    console.log(`Debug: Channel ID - ${channelId}`);
    
    const selectTicketStmt = db.prepare("SELECT * FROM tickets WHERE channel_id = ?");
    selectTicketStmt.get(channelId, (err, ticket) => {
        if (err) {
            console.error('Error fetching ticket from DB:', err);
            interaction.reply({
                content: 'There was an error claiming the ticket.',
                ephemeral: true
            });
            return;
        }
        
        if (ticket) {
            console.log(`Debug: Ticket found in DB with ID - ${ticket.id}`);
            const ticketTypeInfo = config.ticketTypes.find(t => t.name === ticket.ticket_type);
            console.log(`Debug: Ticket type info found - ${!!ticketTypeInfo}`);

            if (ticketTypeInfo && interaction.member.roles.cache.some(role => ticketTypeInfo.supportRoleIds.includes(role.id))) {
                console.log(`Debug: Member has required support role to claim ticket`);
                // Actualiza el ticket en la base de datos para marcarlo como reclamado
                const updateStmt = db.prepare("UPDATE tickets SET staff_id = ? WHERE id = ?");
                updateStmt.run(interaction.member.id, ticket.id);
                updateStmt.finalize();

                console.log(`Debug: Ticket claimed by staff member with ID - ${interaction.member.id}`);
                interaction.reply({
                    content: 'You have successfully claimed this ticket.',
                    ephemeral: true
                });
            } else {
                console.log(`Debug: Member does not have required support role to claim ticket`);
                interaction.reply({
                    content: 'You do not have permission to claim this ticket.',
                    ephemeral: true
                });
            }
        } else {
            console.log(`Debug: No ticket found in DB for channel ID - ${channelId}`);
            interaction.reply({
                content: 'Ticket not found or already claimed.',
                ephemeral: true
            });
        }
    });
}




        }

    if (interaction.isSelectMenu()) {
		
      if (interaction.customId === 'ticket_menu') {
        const ticketType = interaction.values[0];
        const ticketTypeInfo = config.ticketTypes.find(t => t.name === ticketType);
        const guild = interaction.guild;

        guild.channels.create({
          name: `${ticketType.split(' ').join(' ')} | ${interaction.user.username.split('#')[0]}`,
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
			
		  const insertStmt = db.prepare("INSERT INTO tickets (user_id, ticket_type, channel_id) VALUES (?, ?, ?)");
		  insertStmt.run(interaction.user.id, ticketType, ticketChannel.id);
		  insertStmt.finalize();
		  
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
	        if (message.content.startsWith('!ticketstats')) {
			const args = message.content.split(' ');
			const period = args[1] || '24h';
			
			function parseDuration(duration) {
			  const matches = duration.match(/(\d+)([hdmwy])/);
			  if (!matches) return null;

			  const value = parseInt(matches[1]);
			  const unit = matches[2];

			  switch (unit) {
				case 'h': return moment.duration(value, 'hours').asMilliseconds();
				case 'd': return moment.duration(value, 'days').asMilliseconds();
				case 'w': return moment.duration(value, 'weeks').asMilliseconds();
				case 'm': return moment.duration(value, 'months').asMilliseconds();
				case 'y': return moment.duration(value, 'years').asMilliseconds();
				default: return null;
			  }
			}

			const duration = parseDuration(period);
    if (!duration) {
      return message.reply('Invalid time period. Please use a valid duration like "10h", "7d", or "1w".');
    }

    const endTime = moment().valueOf();
    const startTime = endTime - duration;

    db.all(`
      SELECT staff_id, COUNT(*) as count FROM tickets 
      WHERE staff_id IS NOT NULL AND created_at BETWEEN datetime(?, 'unixepoch') AND datetime(?, 'unixepoch')
      GROUP BY staff_id
    `, [startTime / 1000, endTime / 1000], (err, staffRows) => {
      if (err) {
        console.error('Error fetching staff ticket stats:', err);
        return message.reply('There was an error fetching staff ticket statistics.');
      }

      db.all(`
        SELECT ticket_type, COUNT(*) as count FROM tickets 
        WHERE created_at BETWEEN datetime(?, 'unixepoch') AND datetime(?, 'unixepoch') 
        GROUP BY ticket_type
      `, [startTime / 1000, endTime / 1000], (err, typeRows) => {
        if (err) {
          console.error('Error fetching ticket type stats:', err);
          return message.reply('There was an error fetching ticket type statistics.');
        }

        let statsMessage = `Ticket statistics for the last ${period}:\n\n`;
        statsMessage += '**Staff List**\n```\n'; 
		staffRows.forEach(row => {
		  const staffMember = client.users.cache.get(row.staff_id);
		  const staffName = staffMember ? staffMember.tag : 'Unknown';
		  statsMessage += `${staffName}: ${row.count} tickets\n`;
		});
		statsMessage += '```\n'; 
        statsMessage += '\n';
        let totalTickets = 0;
        typeRows.forEach(row => {
          statsMessage += `**${row.ticket_type}**: ${row.count} tickets\n`;
          totalTickets += row.count;
        });
        statsMessage += `\n**Total**: ${totalTickets} tickets`;

        message.reply(statsMessage);
      });
    });
  

  }
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