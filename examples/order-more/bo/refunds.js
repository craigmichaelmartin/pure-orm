class Refunds {
  static get Bo() {
    return require('./refund'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Refunds;
