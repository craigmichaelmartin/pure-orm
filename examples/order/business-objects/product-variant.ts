import { Product } from './product';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'product_variant';

export const columns: IColumns = [
  'id',
  { column: 'product_id', references: Product },
  'price',
];

export class ProductVariant implements IEntity {
  id: number;
  productId: number;
  product?: Product;
  price: number;

  constructor(props: any) {
    this.id = props.id;
    this.productId = props.productId;
    this.product = props.product;
    this.price = props.price;
  }
}

export class ProductVariants implements ICollection<ProductVariant> {
  models: Array<ProductVariant>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const productVariantConfiguration = {
  tableName,
  columns,
  entityClass: ProductVariant,
  collectionClass: ProductVariants,
}
