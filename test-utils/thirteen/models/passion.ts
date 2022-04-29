import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'passion';

export const columns: IColumns = [
  'id',
];

export class Passion implements IModel {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Passions implements ICollection<Passion> {
  models: Array<Passion>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const passionConfiguration = {
  tableName,
  columns,
  Model: Passion,
  Collection: Passions,
}
