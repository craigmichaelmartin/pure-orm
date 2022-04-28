import { create } from '../../src/index';
import { InventoryLevel } from './business-objects/inventory-level';
import { ActualProductVariant } from './business-objects/actual-product-variant';
import { ProductVariant } from './business-objects/product-variant';
import { ProductVariantImage } from './business-objects/product-variant-image';
import { Product } from './business-objects/product';
import { Size } from './business-objects/size';
import { Color } from './business-objects/color';
import { Gender } from './business-objects/gender';
import { Shipment } from './business-objects/shipment';
import { ShipmentActualProductVariant } from './business-objects/shipment-actual-product-variant';
import { Refund } from './business-objects/refund';
import { Order } from './business-objects/order';
import { LineItem } from './business-objects/line-item';
import { Customer } from './business-objects/customer';
import { PhysicalAddress } from './business-objects/physical-address';
import { UtmSource } from './business-objects/utm-source';
import { UtmMedium } from './business-objects/utm-medium';
import { ParcelLineItem } from './business-objects/parcel-line-item';
import { Parcel } from './business-objects/parcel';
import { ParcelEvent } from './business-objects/parcel-event';

export const orm = create({
  getPureORMDataArray: () => [
    InventoryLevel,
    ActualProductVariant,
    ProductVariant,
    ProductVariantImage,
    Product,
    Size,
    Color,
    Gender,
    Shipment,
    ShipmentActualProductVariant,
    Refund,
    Order,
    LineItem,
    Customer,
    PhysicalAddress,
    UtmSource,
    UtmMedium,
    ParcelLineItem,
    Parcel,
    ParcelEvent
  ],
  db: void 0
});
