const db = require('./database.js');

module.exports = function(client, config) {
    const supportChannelId = config.supportChannelId;
    const priorityRoleId = config.priorityRoleId;

    client.on('voiceStateUpdate', (oldState, newState) => {
        const newUserChannel = newState.channel;
        const oldUserChannel = oldState.channel;

        if (newUserChannel && newUserChannel.id === supportChannelId) {
            db.run("INSERT OR REPLACE INTO user_timestamps (user_id, join_timestamp) VALUES (?, ?)", [newState.member.id, Date.now()]);
            updateChannelMemberNames(newUserChannel);
        }

        if (oldUserChannel && oldUserChannel.id === supportChannelId) {
            db.run("DELETE FROM user_timestamps WHERE user_id = ?", [oldState.member.id], (err) => {
                if (err) return;
                updateChannelMemberNames(oldUserChannel);
            });
        }

        // Forzar a mantener el nombre asignado por el bot
        if (newUserChannel && newUserChannel.id === supportChannelId && oldUserChannel && oldUserChannel.id === supportChannelId) {
            setTimeout(() => {
                updateChannelMemberNames(newUserChannel); // Actualizar los nombres después de un corto retraso para asegurar que se apliquen los cambios
            }, 500);
        }
    });

    function updateChannelMemberNames(channel) {
        db.all("SELECT user_id FROM user_timestamps ORDER BY join_timestamp", [], (err, rows) => {
            if (err) return;
            const userIdsOrdered = rows.map(row => row.user_id);
            let index = 1;
            const priorityMembers = [];
            const regularMembers = [];
            userIdsOrdered.forEach(userId => {
                const member = channel.members.get(userId);
                if (member && !member.user.bot) {
                    if (member.roles.cache.has(priorityRoleId)) {
                        priorityMembers.push(member);
                    } else {
                        regularMembers.push(member);
                    }
                }
            });
            priorityMembers.forEach(member => {
                const assignedNickname = `#${index} ${member.user.username}`;
                if (member.nickname !== assignedNickname) {
                    member.setNickname(assignedNickname).catch(() => {});
                }
                index++;
            });
            regularMembers.forEach(member => {
                const assignedNickname = `#${index} ${member.user.username}`;
                if (member.nickname !== assignedNickname) {
                    member.setNickname(assignedNickname).catch(() => {});
                }
                index++;
            });
        });
    }
};
