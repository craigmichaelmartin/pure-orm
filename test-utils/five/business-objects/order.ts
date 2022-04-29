import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'order';

export const columns: IColumns = [
  'id',
  'email',
];

export class Order implements IEntity {
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

export const orderConfiguration = {
  tableName,
  columns,
  entityClass: Order,
  collectionClass: Orders,
}
