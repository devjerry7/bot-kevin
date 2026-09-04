// events/security/blacklistCheck.js
const { isBlacklisted } = require("../../protectionManager");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberAdd",
  async execute(client, member) {
    try {
      // --- Lendo variáveis do .env ---
      const COLOR_ERROR = process.env.COLOR_ERROR
        ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
        : 0xff0000;

      // Verifica no Banco de Dados se o ID está na lista negra
      const blacklisted = await isBlacklisted(member.id);

      if (blacklisted) {
        console.warn(
          `[BLACKLIST] Alerta: O usuário bloqueado ${member.user.tag} (${member.id}) tentou entrar.`,
        );

        // 1. Tenta avisar o usuário na DM antes de banir
        await member
          .send({
            embeds: [
              new EmbedBuilder()
                .setTitle("🚫 Acesso Negado")
                .setDescription(
                  `Você está na **Lista Negra (Blacklist)** deste servidor e foi banido automaticamente.`,
                )
                .setColor(COLOR_ERROR),
            ],
          })
          .catch(() => {}); // Ignora erro se a DM estiver fechada

        // 2. Bane o usuário imediatamente
        if (member.bannable) {
          await member.ban({
            reason: "[AUTO-BAN] Usuário listado na Blacklist de Segurança.",
          });
        } else {
          console.error(
            `[BLACKLIST] Falha: Não consegui banir ${member.user.tag} (Cargo superior ou erro de permissão).`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[BLACKLIST] Erro ao verificar usuário ${member.user.tag}:`,
        error,
      );
    }
  },
};
