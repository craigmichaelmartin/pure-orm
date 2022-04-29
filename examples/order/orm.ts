import { create } from '../../src/index';
import { utmSourceConfiguration } from './models/utm-source';
import { orderConfiguration } from './models/order';
import { lineItemConfiguration } from './models/line-item';
import { productVariantConfiguration } from './models/product-variant';
import { productConfiguration } from './models/product';

const orm = create({
  getPureORMDataArray: () => [
    utmSourceConfiguration,
    orderConfiguration,
    lineItemConfiguration,
    productVariantConfiguration,
    productConfiguration
  ],
  db: void 0
});
export default orm;
