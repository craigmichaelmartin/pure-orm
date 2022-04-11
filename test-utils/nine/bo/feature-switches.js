class FeatureSwitches {
  static get displayName() {
    return 'featureSwitches';
  }
  static get Bo() {
    return require('./feature-switch'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = FeatureSwitches;
