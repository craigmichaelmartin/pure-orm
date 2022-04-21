class Parcels {
  static get Bo() {
    return require('./parcel'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Parcels;
