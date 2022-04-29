import { create } from '../../src/index';
import { inventoryLevelConfiguration } from './entities/inventory-level';
import { actualProductVariantConfiguration } from './entities/actual-product-variant';
import { productVariantConfiguration } from './entities/product-variant';
import { productVariantImageConfiguration } from './entities/product-variant-image';
import { productConfiguration } from './entities/product';
import { sizeConfiguration } from './entities/size';
import { colorConfiguration } from './entities/color';
import { genderConfiguration } from './entities/gender';
import { shipmentConfiguration } from './entities/shipment';
import { shipmentActualProductVariantConfiguration } from './entities/shipment-actual-product-variant';
import { refundConfiguration } from './entities/refund';
import { orderConfiguration } from './entities/order';
import { lineItemConfiguration } from './entities/line-item';
import { customerConfiguration } from './entities/customer';
import { physicalAddressConfiguration } from './entities/physical-address';
import { utmSourceConfiguration } from './entities/utm-source';
import { utmMediumConfiguration } from './entities/utm-medium';
import { parcelLineItemConfiguration } from './entities/parcel-line-item';
import { parcelConfiguration } from './entities/parcel';
import { parcelEventConfiguration } from './entities/parcel-event';

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
