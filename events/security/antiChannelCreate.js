// events/security/antiChannelCreate.js
const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "channelCreate",
  async execute(client, channel) {
    try {
      if (!channel.guild) return;

      await checkSecurity(
        client,
        channel.guild,
        "CHANNEL_CREATE",
        AuditLogEvent.ChannelCreate,
      );
    } catch (error) {
      console.error("[ANTI-CHANNEL-CREATE ERROR]:", error);
    }
  },
};
