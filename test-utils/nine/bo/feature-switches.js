const { BaseBoCollection } = require('../../../src/index');

class FeatureSwitches extends BaseBoCollection {
  static get displayName() {
    return 'featureSwitches';
  }
  static get Bo() {
    return require('./feature-switch'); // eslint-disable-line
  }
}

module.exports = FeatureSwitches;
