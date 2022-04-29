import { Order } from './order';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'line_item';

export const columns: IColumns = [
  'id',
  { column: 'order_id', references: Order },
];

export class LineItem implements IModel {
  id: number;
  orderId: number;
  order?: Order;

  constructor(props: any) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.order = props.order;
  }
}

export class LineItems implements ICollection<LineItem> {
  models: Array<LineItem>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const lineItemConfiguration = {
  tableName,
  columns,
  Model: LineItem,
  Collection: LineItems,
}
