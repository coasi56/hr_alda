const aldaService = require('../../services/aldaService');

module.exports = (app) => {
  app.event('reaction_removed', async ({ event }) => {
    const { user: fromSlackId, reaction: emoji, item, item_user: toSlackId } = event;

    if (!aldaService.isAldaEmoji(emoji)) return;

    if (item.type !== 'message' || !toSlackId) return;

    await aldaService.removeReaction({
      fromSlackId,
      toSlackId,
      emoji,
      channelId: item.channel,
      messageTs: item.ts,
    });
  });
};
