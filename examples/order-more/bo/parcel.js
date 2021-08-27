const BaseBo = require('./base');
const Parcels = require('./parcels');

class Parcel extends BaseBo {
  get BoCollection() {
    return Parcels;
  }

  static get tableName() {
    return 'parcel';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Parcel;
