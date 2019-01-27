class BaseBoCollection {
  constructor(props = {}) {
    this.models = props.models;
  }

  static get displayName() {
    return `${this.Bo.displayName}s`;
  }

  filter(predicate) {
    return new this.constructor({ models: this.models.filter(predicate) });
  }
}

module.exports = BaseBoCollection;
