class Customers {
  static get Bo() {
    return require('./customer'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Customers;
