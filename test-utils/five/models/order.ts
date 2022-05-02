import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'order';

export const columns: IColumns = ['id', 'email'];

export class Order implements IModel {
  id: number;
  email: string;

  constructor(props: any) {
    this.id = props.id;
    this.email = props.email;
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
  Collection: Orders
};
