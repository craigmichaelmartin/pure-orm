import { ProductVariant } from './product-variant';
import { Order } from './order';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'line_item';

export const columns: IColumns = [
  'id',
  { column: 'product_variant_id', references: ProductVariant },
  { column: 'order_id', references: Order },
  'fulfillment_status_id',
  'fulfillable_quantity',
  'fulfillment_service',
  'grams',
  'price',
  'quantity',
  'requires_shipping',
  'taxable',
  'total_discount'
];

export class LineItem implements IModel {
  id: number;
  productVariantId: number;
  productVariant?: ProductVariant;
  orderId: number;
  order?: Order;
  fulfillmentStatusId: number;
  fulfillableQuantity: number;
  fulfillmentService: string;
  grams: string;
  price: number;
  quantity: number;
  requiresShipping: boolean;
  totalDiscount: number;

  constructor(props: any) {
    this.id = props.id;
    this.productVariantId = props.productVariantId;
    this.productVariant = props.productVariant;
    this.orderId = props.orderId;
    this.order = props.order;
    this.fulfillmentStatusId = props.fulfillmentStatusId;
    this.fulfillableQuantity = props.fulfillableQuanity;
    this.fulfillmentService = props.fulfillmentService;
    this.grams = props.grams;
    this.price = props.price;
    this.quantity = props.quanity;
    this.requiresShipping = props.requiresShipping;
    this.totalDiscount = props.totalDiscount;
  }
}

export class LineItems implements ICollection<LineItem> {
  models: Array<LineItem>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const lineItemEntity = {
  tableName,
  columns,
  Model: LineItem,
  Collection: LineItems
};
