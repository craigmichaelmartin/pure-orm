class Members {
  static get Bo() {
    return require('./member'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Members;
