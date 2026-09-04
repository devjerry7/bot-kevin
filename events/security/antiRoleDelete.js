// events/security/antiRoleDelete.js
const { AuditLogEvent } = require("discord.js");
const { checkSecurity } = require("../../securityManager");

module.exports = {
  name: "roleDelete",
  async execute(client, role) {
    try {
      if (!role.guild) return;

      await checkSecurity(
        client,
        role.guild,
        "ROLE_DELETE",
        AuditLogEvent.RoleDelete,
      );
    } catch (error) {
      console.error("[ANTI-ROLE-DELETE ERROR]:", error);
    }
  },
};
