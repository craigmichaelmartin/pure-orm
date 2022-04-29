import { IModel, ICollection, IColumns } from '../../../src/index';
import { ProductVariant } from './product-variant';

export const tableName: string = 'product_variant_image';

export const columns: IColumns = [
  'id',
  { column: 'product_variant_id', references: ProductVariant },
  'image_url_full',
  'image_url_preview',
  'is_primary'
];

export class ProductVariantImage implements IModel {
  id: number;
  productVariantId: number;
  productVariant?: ProductVariant;
  imageUrlFull: string;
  imageUrlPreview: string;
  isPrimary: boolean;

  constructor(props: any) {
    this.id = props.id;
    this.productVariantId = props.productVariantId;
    this.productVariant = props.productVariant;
    this.imageUrlFull = props.imageUrlFull;
    this.imageUrlPreview = props.imageUrlPreview;
    this.isPrimary = props.isPrimary;
  }
}

export class ProductVariantImages implements ICollection<ProductVariantImage> {
  models: Array<ProductVariantImage>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const productVariantImageConfiguration = {
  tableName,
  columns,
  Model: ProductVariantImage,
  Collection: ProductVariantImages,
}
