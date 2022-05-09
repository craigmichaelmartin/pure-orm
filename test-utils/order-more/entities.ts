import { inventoryLevelEntity } from './models/inventory-level';
import { actualProductVariantEntity } from './models/actual-product-variant';
import { productVariantEntity } from './models/product-variant';
import { productVariantImageEntity } from './models/product-variant-image';
import { productEntity } from './models/product';
import { sizeEntity } from './models/size';
import { colorEntity } from './models/color';
import { genderEntity } from './models/gender';
import { shipmentEntity } from './models/shipment';
import { shipmentActualProductVariantEntity } from './models/shipment-actual-product-variant';
import { refundEntity } from './models/refund';
import { orderEntity } from './models/order';
import { lineItemEntity } from './models/line-item';
import { customerEntity } from './models/customer';
import { physicalAddressEntity } from './models/physical-address';
import { utmSourceEntity } from './models/utm-source';
import { utmMediumEntity } from './models/utm-medium';
import { parcelLineItemEntity } from './models/parcel-line-item';
import { parcelEntity } from './models/parcel';
import { parcelEventEntity } from './models/parcel-event';

export const entities = [
  inventoryLevelEntity,
  actualProductVariantEntity,
  productVariantEntity,
  productVariantImageEntity,
  productEntity,
  sizeEntity,
  colorEntity,
  genderEntity,
  shipmentEntity,
  shipmentActualProductVariantEntity,
  refundEntity,
  orderEntity,
  lineItemEntity,
  customerEntity,
  physicalAddressEntity,
  utmSourceEntity,
  utmMediumEntity,
  parcelLineItemEntity,
  parcelEntity,
  parcelEventEntity
];
