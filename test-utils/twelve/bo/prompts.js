class Prompts {
  static get Bo() {
    return require('./prompt'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Prompts;
