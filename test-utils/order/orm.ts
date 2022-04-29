import { create } from '../../src/index';
import { utmSourceEntity } from './models/utm-source';
import { orderEntity } from './models/order';
import { lineItemEntity } from './models/line-item';
import { productVariantEntity } from './models/product-variant';
import { productEntity } from './models/product';

const orm = create({
  getEntities: () => [
    utmSourceEntity,
    orderEntity,
    lineItemEntity,
    productVariantEntity,
    productEntity
  ],
  db: void 0
});
export default orm;
