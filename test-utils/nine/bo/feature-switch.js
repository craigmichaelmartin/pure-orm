const Base = require('./base');
const FeatureSwitches = require('./feature-switches');

class FeatureSwitch extends Base {

  get BoCollection() {
    return FeatureSwitches;
  }

  static get tableName() {
    return 'feature_switch';
  }

  static get sqlColumnsData() {
    return ['id', 'label', 'on'];
  }
}

module.exports = FeatureSwitch;
