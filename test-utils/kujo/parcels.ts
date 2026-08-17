/* The kujo fulfillment domain, mirrored from the application's models/
 * directory as of 2026-08-16. `exchange_line_item` carries five references,
 * two of which point back into the product graph, and `line_item` (in
 * orders.ts) references ExchangeLineItem right back - the circular pair kujo
 * resolves with a lazy columns function.
 */
import { Base, BaseCollection } from './base';
import { IColumns } from '../../src/index';
import { LineItem, Order } from './orders';
import { ActualProductVariant, ProductVariant } from './catalog';

export class Parcel extends Base {}
export class Parcels extends BaseCollection {}
export const parcelEntity = {
  tableName: 'parcel',
  columns: [
    'id',
    'shopify_fulfillment_id',
    'tracking_number',
    'tracking_company',
    'tracking_url',
    'kind',
    'cost',
    'created_date',
    'shipping_label_image_url',
    'shipping_label_pdf_url'
  ] as IColumns,
  Model: Parcel,
  Collection: Parcels
};

export class ParcelLineItem extends Base {}
export class ParcelLineItems extends BaseCollection {}
export const parcelLineItemEntity = {
  tableName: 'parcel_line_item',
  columns: [
    'id',
    { column: 'parcel_id', references: Parcel },
    { column: 'line_item_id', references: LineItem },
    'created_date'
  ] as IColumns,
  Model: ParcelLineItem,
  Collection: ParcelLineItems
};

export class Return extends Base {}
export class Returns extends BaseCollection {}
export const returnEntity = {
  tableName: 'return',
  columns: [
    'id',
    'wfi_order_id',
    { column: 'order_id', references: Order },
    'created_date',
    'kujo_imported_date'
  ] as IColumns,
  Model: Return,
  Collection: Returns
};

export class ReturnLineItem extends Base {}
export class ReturnLineItems extends BaseCollection {}
export const returnLineItemEntity = {
  tableName: 'return_line_item',
  columns: [
    'id',
    { column: 'return_id', references: Return },
    { column: 'line_item_id', references: LineItem },
    'reason',
    'quantity',
    'status',
    'created_date'
  ] as IColumns,
  Model: ReturnLineItem,
  Collection: ReturnLineItems
};

export class Exchange extends Base {}
export class Exchanges extends BaseCollection {}
export const exchangeEntity = {
  tableName: 'exchange',
  columns: [
    'id',
    'wfi_order_id',
    'wfi_new_order_id',
    { column: 'order_id', references: Order },
    'pending',
    'created_date',
    'kujo_imported_date'
  ] as IColumns,
  Model: Exchange,
  Collection: Exchanges
};

export class ExchangeLineItem extends Base {}
export class ExchangeLineItems extends BaseCollection {}
export const exchangeLineItemEntity = {
  tableName: 'exchange_line_item',
  columns: [
    'id',
    { column: 'exchange_id', references: Exchange },
    { column: 'line_item_id', references: LineItem },
    {
      column: 'new_actual_product_variant_id',
      references: ActualProductVariant
    },
    { column: 'desired_product_variant_id', references: ProductVariant },
    'quantity',
    'status',
    'created_date'
  ] as IColumns,
  Model: ExchangeLineItem,
  Collection: ExchangeLineItems
};
