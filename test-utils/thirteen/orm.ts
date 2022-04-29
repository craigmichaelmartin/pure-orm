import { create } from '../../src/index';
import { memberConfiguration } from './entities/member';
import { recommendationConfiguration } from './entities/recommendation';
import { brandConfiguration } from './entities/brand';
import { productConfiguration } from './entities/product';
import { categoryConfiguration } from './entities/category';
import { passionConfiguration } from './entities/passion';
import { recommendationAudienceConfiguration } from './entities/recommendation-audience';
import { audienceConfiguration } from './entities/audience';
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
