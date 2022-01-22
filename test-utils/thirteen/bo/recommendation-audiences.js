const { BaseBoCollection } = require('../../../src/index');

class RecommendationAudiences extends BaseBoCollection {
  static get Bo() {
    return require('./recommendation-audience'); // eslint-disable-line
  }
}

module.exports = RecommendationAudiences;
