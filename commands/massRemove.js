// commands/massRemove.js
const { EmbedBuilder } = require("discord.js");

const handleMassRemove = async (message, args) => {
  try {
    // --- Lendo variáveis estéticas e de configuração do .env ---
    const PREFIX = process.env.PREFIX || "mc!";
    const COLOR_WARNING = process.env.COLOR_WARNING
      ? parseInt(process.env.COLOR_WARNING.replace("#", ""), 16)
      : 0xffa500;
    const COLOR_SUCCESS = process.env.COLOR_SUCCESS
      ? parseInt(process.env.COLOR_SUCCESS.replace("#", ""), 16)
      : 0x00ff00;
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
      : 0xff0000;

    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";
    const EMOJI_WAIT = process.env.EMOJI_WAIT || "⏳";
    const EMOJI_LOADING = process.env.EMOJI_LOADING || "🔄";
    const EMOJI_WARNING = process.env.EMOJI_WARNING || "⚠️";
    const EMOJI_BROOM = process.env.EMOJI_BROOM || "🧹";
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";

    // Whitelist de Segurança Extrema (Apenas Donos)
    const whitelistEnv = process.env.WHITELIST_IDS || "";
    const WHITELIST_IDS = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    // 1. Verificação de Acesso: Apenas Whitelist pode executar limpeza em massa
    if (!WHITELIST_IDS.includes(message.author.id)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${EMOJI_ERROR} Acesso Negado`)
            .setDescription(
              "Apenas membros da **Whitelist Oficial (Donos)** podem executar remoções em massa de cargos.",
            )
            .setColor(COLOR_ERROR)
            .setTimestamp(),
        ],
      });
    }

    // 2. Identificar o Cargo (por Menção ou ID)
    const role =
      message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

    if (!role) {
      return message.channel.send(
        `${EMOJI_ERROR} Uso correto: \`${PREFIX}limparcargo @cargo\` ou \`${PREFIX}limparcargo <ID>\``,
      );
    }

    // 3. Proteção contra remoção do cargo gerenciado do próprio bot ou cargos administrativos críticos
    if (role.managed || role.permissions.has("Administrator")) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** Você não pode executar limpeza em massa em cargos administrativos ou integrados por bots.`,
      );
    }

    // 4. Verificação de Hierarquia (O bot precisa estar ACIMA do cargo)
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.channel.send(
        `${EMOJI_ERROR} Erro de Hierarquia: O cargo **${role.name}** está acima do meu cargo mais alto.`,
      );
    }

    // 5. Início do Processo
    const statusMsg = await message.channel.send(
      `${EMOJI_LOADING} Buscando membros com o cargo **${role.name}**... aguarde.`,
    );

    // Força o bot a buscar todos os membros do servidor (cache full)
    await message.guild.members.fetch();
    const membersWithRole = role.members;
    const total = membersWithRole.size;

    if (total === 0) {
      return statusMsg.edit(
        `${EMOJI_WARNING} Ninguém possui o cargo **${role.name}** atualmente.`,
      );
    }

    // 6. Embed de Progresso
    const progressEmbed = new EmbedBuilder()
      .setTitle(`${EMOJI_BROOM} Limpeza Iniciada: ${role.name}`)
      .setDescription(
        `Encontrados **${total}** membros.\nRemovendo cargos um por um...`,
      )
      .setColor(COLOR_WARNING)
      .setFooter({
        text: "O processo é lento para evitar bloqueios do Discord.",
      })
      .setTimestamp();

    await statusMsg.edit({ content: null, embeds: [progressEmbed] });

    // 7. Loop de Remoção com Delay (Anti-Rate Limit) e checagem de imunidade Whitelist
    let processed = 0;
    let errors = 0;

    for (const [id, member] of membersWithRole) {
      // Impede que o massRemove afete membros da Whitelist mesmo se tiverem o cargo alvo
      if (WHITELIST_IDS.includes(member.id)) {
        errors++;
        continue;
      }

      try {
        await member.roles.remove(role);
        processed++;
      } catch (err) {
        console.error(`Erro ao remover de ${member.user.tag}:`, err);
        errors++;
      }

      // 🛑 DELAY OBRIGATÓRIO: 1 segundo entre cada membro
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualiza o embed a cada 5 membros para dar feedback visual
      if (processed % 5 === 0 || processed === total) {
        progressEmbed.setDescription(
          `${EMOJI_WAIT} Progresso: **${processed}/${total}** removidos.\nFalhas/Imunes: **${errors}**`,
        );
        await statusMsg.edit({ embeds: [progressEmbed] }).catch(() => {});
      }
    }

    // 8. Finalização
    const finalEmbed = new EmbedBuilder()
      .setTitle(`${EMOJI_SUCCESS} Limpeza Concluída: ${role.name}`)
      .addFields(
        { name: "Sucesso", value: `\`${processed}\` membros`, inline: true },
        { name: "Falhas/Imunes", value: `\`${errors}\` membros`, inline: true },
      )
      .setColor(COLOR_SUCCESS)
      .setTimestamp();

    await statusMsg.edit({ embeds: [finalEmbed] }).catch(() => {
      message.channel.send({ embeds: [finalEmbed] });
    });
  } catch (error) {
    console.error("Erro crítico no massRemove:", error);
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    message.channel.send(
      `${EMOJI_ERROR} Ocorreu um erro interno ao processar a remoção em massa.`,
    );
  }
};

module.exports = { handleMassRemove };
