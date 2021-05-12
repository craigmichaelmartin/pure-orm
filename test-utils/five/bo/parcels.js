const { BaseBoCollection } = require('../../../src/index');

class Parcels extends BaseBoCollection {
  static get Bo() {
    return require('./parcel'); // eslint-disable-line
  }
}

module.exports = Parcels;
