import { create } from '../../src/index';
import { memberConfiguration } from './models/member';
import { recommendationConfiguration } from './models/recommendation';
import { brandConfiguration } from './models/brand';
import { productConfiguration } from './models/product';
import { categoryConfiguration } from './models/category';
import { passionConfiguration } from './models/passion';
import { recommendationAudienceConfiguration } from './models/recommendation-audience';
import { audienceConfiguration } from './models/audience';
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
