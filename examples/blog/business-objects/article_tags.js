class ArticleTags {
  static get Bo() {
    return require('./article_tag'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ArticleTags;
