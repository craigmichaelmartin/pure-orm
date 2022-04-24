import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'brand';

export const columns: IColumns = [
  'id',
];

export class Brand implements IModel {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Brands implements ICollection<Brand> {
  models: Array<Brand>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const brandEntity = {
  tableName,
  columns,
  Model: Brand,
  Collection: Brands,
}
