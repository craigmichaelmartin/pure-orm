import { create } from '../../src/index';
import { inventoryLevelConfiguration } from './models/inventory-level';
import { actualProductVariantConfiguration } from './models/actual-product-variant';
import { productVariantConfiguration } from './models/product-variant';
import { productVariantImageConfiguration } from './models/product-variant-image';
import { productConfiguration } from './models/product';
import { sizeConfiguration } from './models/size';
import { colorConfiguration } from './models/color';
import { genderConfiguration } from './models/gender';
import { shipmentConfiguration } from './models/shipment';
import { shipmentActualProductVariantConfiguration } from './models/shipment-actual-product-variant';
import { refundConfiguration } from './models/refund';
import { orderConfiguration } from './models/order';
import { lineItemConfiguration } from './models/line-item';
import { customerConfiguration } from './models/customer';
import { physicalAddressConfiguration } from './models/physical-address';
import { utmSourceConfiguration } from './models/utm-source';
import { utmMediumConfiguration } from './models/utm-medium';
import { parcelLineItemConfiguration } from './models/parcel-line-item';
import { parcelConfiguration } from './models/parcel';
import { parcelEventConfiguration } from './models/parcel-event';

const orm = create({
  getPureORMDataArray: () => [
    inventoryLevelConfiguration,
    actualProductVariantConfiguration,
    productVariantConfiguration,
    productVariantImageConfiguration,
    productConfiguration,
    sizeConfiguration,
    colorConfiguration,
    genderConfiguration,
    shipmentConfiguration,
    shipmentActualProductVariantConfiguration,
    refundConfiguration,
    orderConfiguration,
    lineItemConfiguration,
    customerConfiguration,
    physicalAddressConfiguration,
    utmSourceConfiguration,
    utmMediumConfiguration,
    parcelLineItemConfiguration,
    parcelConfiguration,
    parcelEventConfiguration,
  ],
  db: void 0
});
export default orm;
