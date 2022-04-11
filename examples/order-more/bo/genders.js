class Genders {
  static get Bo() {
    return require('./gender'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Genders;
