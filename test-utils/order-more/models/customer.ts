import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'customer';

export const columns: IColumns = ['id', 'email'];

export class Customer implements IModel {
  id: number;
  email: string;

  constructor(props: any) {
    this.id = props.id;
    this.email = props.email;
  }
}

export class Customers implements ICollection<Customer> {
  models: Array<Customer>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const customerEntity = {
  tableName,
  columns,
  Model: Customer,
  Collection: Customers
};
