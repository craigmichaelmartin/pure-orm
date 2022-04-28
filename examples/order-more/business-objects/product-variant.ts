import { Product } from './product';
import { ActualProductVariant } from './actual-product-variant';
import { Color } from './color';
import { Gender } from './gender';
import { Size } from './size';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'product_variant';

export const columns: IColumns = [
  'id',
  { column: 'product_id', references: Product },
  { column: 'actual_product_variant_id', references: ActualProductVariant },
  { column: 'color_id', references: Color },
  { column: 'gender_id', references: Gender },
  { column: 'size_id', references: Size },
  'shopify_id',
  'image_url',
  'barcode',
  'price',
  'compare_at_price',
  'created_date',
  'updated_date',
  'grams',
  'requires_shipping'
];

export class ProductVariant implements IEntity {
  id: number;
  product_id: number;
  product?: Product;
  actualProductVariantId: number;
  actualProductVariant?: ActualProductVariant;
  colorId: number;
  color?: Color;
  genderId: number;
  gender?: Gender;
  sizeId: number;
  size?: Size;
  shopifyId: number;
  imageUrl: string;
  barcode: string;
  price: number;
  compareAtPrice: number;
  createdDate: Date;
  updatedDate: Date;
  grams: number;
  requiresShipping: boolean;

  constructor(props: any) {
    this.id = props.id;
    this.product_id = props.productId;
    this.product = props.product;
    this.actualProductVariantId = props.actualProductVariantId;
    this.actualProductVariant = props.actualProductVariant;
    this.colorId = props.color;
    this.color = props.color;
    this.genderId = props.genderId;
    this.gender = props.gender;
    this.sizeId = props.sizeId;
    this.size = props.size;
    this.shopifyId = props.shopifyId;
    this.imageUrl = props.imageUrl;
    this.barcode = props.barcode;
    this.price = props.price;
    this.compareAtPrice = props.compareAtPrice;
    this.createdDate = props.createDate;
    this.updatedDate = props.updateDate;
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

export const productVariantConfiguration = {
  tableName,
  columns,
  entityClass: ProductVariant,
  collectionClass: ProductVariants,
}
