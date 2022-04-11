class RecommendationAudiences {
  static get Bo() {
    return require('./recommendation-audience'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = RecommendationAudiences;
