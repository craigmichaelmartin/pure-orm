const { BaseBoCollection } = require('../../../src/index');

class PhysicalAddresses extends BaseBoCollection {
  static get displayName() {
    return 'physicalAddresses';
  }
  static get Bo() {
    return require('./physical-address'); // eslint-disable-line
  }
}

module.exports = PhysicalAddresses;
