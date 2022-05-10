import { orderEntity } from './models/order';
import { utmSourceEntity } from './models/utm-source';
import { lineItemEntity } from './models/line-item';
import { productVariantEntity } from './models/product-variant';
import { productEntity } from './models/product';

export const entities = [
  orderEntity,
  utmSourceEntity,
  lineItemEntity,
  productVariantEntity,
  productEntity
];
