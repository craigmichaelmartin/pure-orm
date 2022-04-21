class Articles {
  static get Bo() {
    return require('./article'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Articles;
