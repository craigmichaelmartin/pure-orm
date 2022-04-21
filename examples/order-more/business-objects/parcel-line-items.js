class ParcelLineItems {
  static get Bo() {
    return require('./parcel-line-item'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ParcelLineItems;
