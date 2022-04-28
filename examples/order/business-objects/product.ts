import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'product';

export const columns: IColumns = [
  'id',
  'value',
  'label',
];

export class Product implements IEntity {
  id: number;
  value: string;
  label: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
  }
}

export class Products implements ICollection<Product> {
  models: Array<Product>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const productConfiguration = {
  tableName,
  columns,
  entityClass: Product,
  collectionClass: Products,
}
