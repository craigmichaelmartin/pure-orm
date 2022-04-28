import { create } from '../../src/index';
import { utmSourceConfiguration } from './business-objects/utm-source';
import { orderConfiguration } from './business-objects/order';
import { lineItemConfiguration } from './business-objects/line-item';
import { productVariantConfiguration } from './business-objects/product-variant';
import { productConfiguration } from './business-objects/product';

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
