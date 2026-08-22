const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Sistema de Cache simples para não sobrecarregar o banco (SQLite) a cada mensagem
let configCache = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minuto de cache

// Mantemos o parâmetro (guildId) na função para não ter que reescrever
// todos os arquivos de comando agora, mas internamente o bot ignora ele.
const getGuildConfig = async (guildId) => {
  const now = Date.now();

  // Retorna do cache se ainda for válido
  if (configCache && now - lastFetch < CACHE_TTL) {
    return configCache;
  }

  try {
    // 👇 AQUI ESTÁ A CORREÇÃO: Usando a nova tabela ServerConfig e ID fixo
    let config = await prisma.serverConfig.findUnique({
      where: { id: "main" },
    });

    // Se a configuração ainda não existe no banco, cria a padrão
    if (!config) {
      config = await prisma.serverConfig.create({
        data: { id: "main", prefix: "k!" },
      });
    }

    // Salva no cache
    configCache = config;
    lastFetch = now;

    return config;
  } catch (error) {
    console.error("[ERRO DB] Falha ao buscar ServerConfig:", error);
    // Fallback de segurança para o bot não crashar se o banco falhar
    return { prefix: "k!" };
  }
};

// Função extra caso você crie um comando para limpar o cache no futuro
const clearConfigCache = () => {
  configCache = null;
  lastFetch = 0;
};

module.exports = { getGuildConfig, clearConfigCache };
