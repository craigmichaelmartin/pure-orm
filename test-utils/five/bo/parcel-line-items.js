const { BaseBoCollection } = require('../../../src/index');

class ParcelLineItems extends BaseBoCollection {
  static get Bo() {
    return require('./parcel-line-item'); // eslint-disable-line
  }
}

module.exports = ParcelLineItems;
