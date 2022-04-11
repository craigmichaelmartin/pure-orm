const { create } = require('pure-orm');
const Member = require('./bo/member');
const Recommendation = require('./bo/recommendation');
const Brand = require('./bo/brand');
const Product = require('./bo/product');
const Category = require('./bo/category');
const Passion = require('./bo/passion');
const RecommendationAudience = require('./bo/recommendation-audience');
const Audience = require('./bo/audience');
const getBusinessObjects = () => [
  Member,
  Recommendation,
  Brand,
  Product,
  Category,
  Passion,
  RecommendationAudience,
  Audience
];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
