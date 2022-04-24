import { Customer } from './customer';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'order';

export const columns: IColumns = [
  'id',
  { column: 'customer_id', references: Customer },
];

export class Order implements IModel {
  id: number;
  customerId: number;
  customer?: Customer;

  constructor(props: any) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.customer = props.customer;
  }
}

export class Orders implements ICollection<Order> {
  models: Array<Order>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const orderEntity = {
  tableName,
  columns,
  Model: Order,
  Collection: Orders,
}
