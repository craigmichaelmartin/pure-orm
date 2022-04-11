class PhysicalAddresses {
  static get displayName() {
    return 'physicalAddresses';
  }
  static get Bo() {
    return require('./physical-address'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = PhysicalAddresses;
