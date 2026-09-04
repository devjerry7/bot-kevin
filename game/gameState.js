// game/gameState.js

// Objeto que armazenará o estado global do jogo para o servidor único
let gameState = {
  isActive: false,
  currentRound: 0,
  maxRounds: 3, // Limite de rodadas
  totalScores: {}, // Placar acumulado de todos os jogadores
  currentLetter: null,
  startTime: null,
  duration: 60,
  players: {},
  categories: ["Nome", "Objeto", "Cidade", "Animal"],
  timer: null, // Para armazenar o objeto Timer
};

/**
 * Retorna o estado atual do jogo.
 * @returns {object} O objeto de estado do jogo.
 */
function getGameState() {
  return gameState;
}

module.exports = {
  getGameState,
};
