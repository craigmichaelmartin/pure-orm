import { Member } from './member';
import { Brand } from './brand';
import { Product } from './product';
import { Category } from './category';
import { Passion } from './passion';

import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'recommendation';

export const columns: IColumns = [
  'id',
  { column: 'member_id', references: Member },
  { column: 'brand_id', references: Brand },
  { column: 'product_id', references: Product },
  { column: 'category_id', references: Category },
  { column: 'passion_id', references: Passion }
];

export class Recommendation implements IModel {
  id: number;
  memberId: number;
  member?: Member;
  brandId: number;
  brand?: Brand;
  productId: number;
  product?: Product;
  categoryId: number;
  category?: Category;
  passionId: number;
  passion?: Passion;

  constructor(props: any) {
    this.id = props.id;
    this.memberId = props.memberId;
    this.member = props.member;
    this.brandId = props.brandId;
    this.brand = props.brand;
    this.productId = props.productId;
    this.product = props.product;
    this.categoryId = props.categoryId;
    this.category = props.category;
    this.passionId = props.passionId;
    this.passion = props.passion;
  }
}

export class Recommendations implements ICollection<Recommendation> {
  models: Array<Recommendation>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const recommendationEntity = {
  tableName,
  columns,
  Model: Recommendation,
  Collection: Recommendations
};
