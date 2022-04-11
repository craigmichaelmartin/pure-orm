class Passions {
  static get Bo() {
    return require('./passion'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Passions;
