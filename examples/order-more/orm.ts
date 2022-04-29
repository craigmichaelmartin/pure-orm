import { create } from '../../src/index';
import { inventoryLevelConfiguration } from './business-objects/inventory-level';
import { actualProductVariantConfiguration } from './business-objects/actual-product-variant';
import { productVariantConfiguration } from './business-objects/product-variant';
import { productVariantImageConfiguration } from './business-objects/product-variant-image';
import { productConfiguration } from './business-objects/product';
import { sizeConfiguration } from './business-objects/size';
import { colorConfiguration } from './business-objects/color';
import { genderConfiguration } from './business-objects/gender';
import { shipmentConfiguration } from './business-objects/shipment';
import { shipmentActualProductVariantConfiguration } from './business-objects/shipment-actual-product-variant';
import { refundConfiguration } from './business-objects/refund';
import { orderConfiguration } from './business-objects/order';
import { lineItemConfiguration } from './business-objects/line-item';
import { customerConfiguration } from './business-objects/customer';
import { physicalAddressConfiguration } from './business-objects/physical-address';
import { utmSourceConfiguration } from './business-objects/utm-source';
import { utmMediumConfiguration } from './business-objects/utm-medium';
import { parcelLineItemConfiguration } from './business-objects/parcel-line-item';
import { parcelConfiguration } from './business-objects/parcel';
import { parcelEventConfiguration } from './business-objects/parcel-event';

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
