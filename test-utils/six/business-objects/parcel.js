const Parcels = require('./parcels');

class Parcel {
  constructor(props) {
    Object.assign(this, props);
  }

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
