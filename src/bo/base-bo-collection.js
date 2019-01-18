class BaseBoCollection {

  constructor(props = {}) {
    this.models = props.models;
  }

  static get displayName() {
    return `${this.Bo.displayName}s`;
  }

  static parseFromDatabase(rows) {
    const models = rows.map(
      row => new this.Bo(this.bo.parseFromDatabase(row))
    );
    return { models };
  }

  filter(predicate) {
    return new this.Bo({ models: this.models.filter(predicate) });
  }

}

module.exports = BaseBoCollection;
