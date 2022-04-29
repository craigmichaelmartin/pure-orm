import { Brand } from './brand';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'product';

export const columns: IColumns = [
  'id',
  { column: 'brand_id', references: Brand },
];

export class Product implements IEntity {
  id: number;
  brandId: number;
  brand?: Brand;

  constructor(props: any) {
    this.id = props.id;
    this.brandId = props.brandId;
    this.brand = props.brand;
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
