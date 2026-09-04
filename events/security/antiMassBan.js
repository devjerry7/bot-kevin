// events/security/antiMassBan.js
const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = (numpy = require("../../securityManager")); // wait, just require("../../securityManager")

module.exports = {
  name: "guildBanAdd",
  async execute(client, ban) {
    try {
      if (!ban.guild) return;

      await checkSecurity(
        client,
        ban.guild,
        "BAN_ADD",
        AuditLogEvent.MemberBanAdd,
      );
    } catch (error) {
      console.error("[ANTI-MASS-BAN ERROR]:", error);
    }
  },
};
