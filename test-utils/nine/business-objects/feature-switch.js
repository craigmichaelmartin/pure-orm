const FeatureSwitches = require('./feature-switches');

class FeatureSwitch {
  constructor(props) {
    Object.assign(this, props);
  }

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
