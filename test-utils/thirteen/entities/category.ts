import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'category';

export const columns: IColumns = [
  'id',
];

export class Category implements IEntity {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Categories implements ICollection<Category> {
  models: Array<Category>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const categoryConfiguration = {
  tableName,
  columns,
  entityClass: Category,
  collectionClass: Categories,
}
