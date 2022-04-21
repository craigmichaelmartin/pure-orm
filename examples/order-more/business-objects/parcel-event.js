const ParcelEvents = require('./parcel-events');
const Parcel = require('./parcel');

class ParcelEvent {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return ParcelEvents;
  }

  static get tableName() {
    return 'parcel_event';
  }

  static get sqlColumnsData() {
    return ['id', { column: 'parcel_id', references: Parcel }, 'eta', 'status'];
  }
}

module.exports = ParcelEvent;
