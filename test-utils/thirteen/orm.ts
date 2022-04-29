import { create } from '../../src/index';
import { memberEntity } from './models/member';
import { recommendationEntity } from './models/recommendation';
import { brandEntity } from './models/brand';
import { productEntity } from './models/product';
import { categoryEntity } from './models/category';
import { passionEntity } from './models/passion';
import { recommendationAudienceEntity } from './models/recommendation-audience';
import { audienceEntity } from './models/audience';
const orm = create({
  getEntities: () => [
    memberEntity,
    recommendationEntity,
    brandEntity,
    productEntity,
    categoryEntity,
    passionEntity,
    recommendationAudienceEntity,
    audienceEntity
  ],
  db: void 0
});
export default orm;
