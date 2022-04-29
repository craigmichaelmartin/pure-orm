import { create } from '../../src/index';
import { memberConfiguration } from './business-objects/member';
import { recommendationConfiguration } from './business-objects/recommendation';
import { brandConfiguration } from './business-objects/brand';
import { productConfiguration } from './business-objects/product';
import { categoryConfiguration } from './business-objects/category';
import { passionConfiguration } from './business-objects/passion';
import { recommendationAudienceConfiguration } from './business-objects/recommendation-audience';
import { audienceConfiguration } from './business-objects/audience';
const orm = create({
  getPureORMDataArray: () => [
    memberConfiguration,
    recommendationConfiguration,
    brandConfiguration,
    productConfiguration,
    categoryConfiguration,
    passionConfiguration,
    recommendationAudienceConfiguration,
    audienceConfiguration
  ],
  db: void 0
});
export default orm;
