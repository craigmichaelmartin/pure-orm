class InventoryLevels {
  static get Bo() {
    return require('./inventory-level'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = InventoryLevels;
