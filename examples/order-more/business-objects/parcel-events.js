class ParcelEvents {
  static get Bo() {
    return require('./parcel-event'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ParcelEvents;
