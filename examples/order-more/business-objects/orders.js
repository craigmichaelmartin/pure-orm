class Orders {
  static get Bo() {
    return require('./order'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Orders;
