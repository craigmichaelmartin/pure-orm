import { UtmSource } from './utm-source';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'order';

export const columns: IColumns = [
  'id',
  'email',
  'subtotal_price',
  'taxes_included',
  'total_discounts',
  'total_price',
  { column: 'utm_source_id', references: UtmSource },
];

export class Order implements IEntity {
  id: number;
  email: string;
  subtotalPrice: number;
  taxesIncluded: boolean;
  totalDiscounts: number;
  totalPrice: number;
  utmSourceId: number;
  utmSource?: UtmSource;

  constructor(props: any) {
    this.id = props.id;
    this.email = props.email;
    this.subtotalPrice = props.subtotalPrice;
    this.taxesIncluded = props.taxesIncluded;
    this.totalDiscounts = props.totalDiscounts;
    this.totalPrice = props.totalPrice;
    this.utmSourceId = props.utmSourceId;
    this.utmSource = props.utmSource;
  }
}

export class Orders implements ICollection<Order> {
  models: Array<Order>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const orderConfiguration = {
  tableName,
  columns,
  entityClass: Order,
  collectionClass: Orders,
}
