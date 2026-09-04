// events/security/antiChannelDelete.js
const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "channelDelete",
  async execute(client, channel) {
    try {
      if (!channel.guild) return;

      await checkSecurity(
        client,
        channel.guild,
        "CHANNEL_DELETE",
        AuditLogEvent.ChannelDelete,
      );
    } catch (error) {
      console.error("[ANTI-CHANNEL-DELETE ERROR]:", error);
    }
  },
};
