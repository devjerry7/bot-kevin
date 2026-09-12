class BaseProvider {
  constructor(platformName) {
    this.name = platformName;
  }

  /**
   * Método obrigatório para buscar status dos streamers
   * @param {Array} streamersLista Lista de streamers vindos do banco
   * @returns {Promise<Array<StandardLiveEvent>>}
   */
  async checkLives(streamersLista) {
    throw new Error(
      `O método checkLives() não foi implementado no provider ${this.name}`,
    );
  }
}

module.exports = BaseProvider;
