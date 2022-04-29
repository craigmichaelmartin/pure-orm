import { create } from '../../src/index';
import { utmSourceConfiguration } from './entities/utm-source';
import { orderConfiguration } from './entities/order';
import { lineItemConfiguration } from './entities/line-item';
import { productVariantConfiguration } from './entities/product-variant';
import { productConfiguration } from './entities/product';

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
