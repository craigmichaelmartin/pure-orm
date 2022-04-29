import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'brand';

export const columns: IColumns = [
  'id',
];

export class Brand implements IEntity {
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

export const brandConfiguration = {
  tableName,
  columns,
  entityClass: Brand,
  collectionClass: Brands,
}
