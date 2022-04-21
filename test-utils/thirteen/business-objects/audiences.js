class Audiences {
  static get Bo() {
    return require('./audience'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Audiences;
