import { Customer } from './customer';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'order';

export const columns: IColumns = [
  'id',
  { column: 'customer_id', references: Customer },
];

export class Order implements IEntity {
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

export const orderConfiguration = {
  tableName,
  columns,
  entityClass: Order,
  collectionClass: Orders,
}
