const Base = require('./base');
const RecommendationAudiences = require('./recommendation-audiences');
const Recommendation = require('./recommendation');
const Audience = require('./audience');

class RecommendationAudience extends Base {
  get BoCollection() {
    return RecommendationAudiences;
  }

  static get tableName() {
    return 'recommendation_audience';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'recommendation_id', references: Recommendation },
      { column: 'audience_id', references: Audience }
    ];
  }
}

module.exports = RecommendationAudience;
