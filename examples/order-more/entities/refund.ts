import { Order } from './order';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'refund';

export const columns: IColumns = [
  'id',
  { column: 'order_id', references: Order },
  'shopify_id',
  'created_date',
  'processed_date',
  'kujo_imported_date',
  'amount',
  'note',
  'restock'
];

export class Refund implements IEntity {
  id: number;
  orderId: number;
  order?: Order;
  shopifyId: string;
  createdDate: Date;
  processedDate: Date;
  kujoImportDate: Date;
  amount: number;
  note: string;
  restock: boolean;

  constructor(props: any) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.order = props.order;
    this.shopifyId = props.shopifyId;
    this.createdDate = props.createdDate;
    this.processedDate = props.processedDate;
    this.kujoImportDate = props.kujoImportDate;
    this.amount = props.amount;
    this.note = props.note;
    this.restock = props.restock;
  }
}

export class Refunds implements ICollection<Refund> {
  models: Array<Refund>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const refundConfiguration = {
  tableName,
  columns,
  entityClass: Refund,
  collectionClass: Refunds,
}
