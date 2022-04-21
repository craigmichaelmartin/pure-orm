const { create } = require('pure-orm');
const Member = require('./business-objects/member');
const Recommendation = require('./business-objects/recommendation');
const Brand = require('./business-objects/brand');
const Product = require('./business-objects/product');
const Category = require('./business-objects/category');
const Passion = require('./business-objects/passion');
const RecommendationAudience = require('./business-objects/recommendation-audience');
const Audience = require('./business-objects/audience');
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
