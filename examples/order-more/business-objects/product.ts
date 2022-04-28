import { IEntity, ICollection, IColumns } from '../../../src/index';
import { Vendor } from './vendor';

export const tableName: string = 'product';

export const columns: IColumns = [
  'id',
  'vendor_id',
  'shopify_id',
  'value',
  'label',
  'product_type',
  'created_date',
  'updated_date',
  'published_date',
  'category'
];

export class Product implements IEntity {
  id: number;
  vendorId: number;
  vendor?: Vendor;
  shopifyId: number;
  value: string;
  label: string;
  productType: string;
  createdDate: Date;
  updatedDate: Date;
  publishedDate: Date;
  category: string;

  constructor(props: any) {
    this.id = props.id;
    this.vendorId = props.vendorId;
    this.vendor = props.vendor;
    this.shopifyId = props.shopifyId;
    this.value = props.value;
    this.label = props.label;
    this.productType = props.productType;
    this.createdDate = props.createdDate;
    this.updatedDate = props.updatedDate;
    this.publishedDate = props.publishedDate;
    this.category = props.category;
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
