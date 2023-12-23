import { IModel, ICollection, IColumns } from '../../../src/index';
import { Person } from './person';

export const tableName: string = 'customer';

export const columns: IColumns = [
  'id',
  { column: 'locked_to_affiliate_id', references: Person },
  { column: 'locked_to_salesperson_id', references: Person }
];

export class Customer implements IModel {
  id: number;
  lockedToAffiliateId: number;
  lockedToSalespersonId: number;

  constructor(props: any) {
    this.id = props.id;
    this.lockedToAffiliateId = props.lockedToAffiliateId;
    this.lockedToSalespersonId = props.lockedToSalespersonId;
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
