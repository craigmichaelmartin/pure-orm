class ActualProductVariants {
  static get Bo() {
    return require('./actual-product-variant'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ActualProductVariants;
