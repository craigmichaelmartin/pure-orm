class Shipments {
  static get Bo() {
    return require('./shipment'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Shipments;
