const { BaseBoCollection } = require('../../../src/index');

class ParcelEvents extends BaseBoCollection {
  static get Bo() {
    return require('./parcel-event'); // eslint-disable-line
  }
}

module.exports = ParcelEvents;
