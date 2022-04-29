import { Product } from './product';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'product_variant';

export const columns: IColumns = [
  'id',
  { column: 'product_id', references: Product },
  'actual_product_variant_id',
  'color_id',
  'gender_id',
  'size_id',
  'barcode',
  'price',
  'compare_at_price',
  'created_date',
  'updated_date',
  'grams',
  'requires_shipping'
];

export class ProductVariant implements IModel {
  id: number;
  productId: number;
  product?: Product;
  actualProductVariantId: number;
  colorId: number;
  genderId: number;
  sizeId: number;
  barcode: number;
  price: number;
  compareAtPrice: number;
  createdDate: number;
  updatedDate: number;
  grams: number;
  requiresShipping: number;

  constructor(props: any) {
    this.id = props.id;
    this.productId = props.productId;
    this.product = props.product;
    this.actualProductVariantId = props.actualProductVariantId;
    this.colorId = props.colorId;
    this.genderId = props.genderId;
    this.sizeId = props.sizeId;
    this.barcode = props.barcode;
    this.price = props.price;
    this.compareAtPrice = props.compareAtPrice;
    this.createdDate = props.createdDate;
    this.updatedDate = props.updatedDate;
    this.grams = props.grams;
    this.requiresShipping = props.requiresShipping;
  }
}

export class ProductVariants implements ICollection<ProductVariant> {
  models: Array<ProductVariant>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const productVariantEntity = {
  tableName,
  columns,
  Model: ProductVariant,
  Collection: ProductVariants,
}
