import { UtmSource } from './utm-source';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'order';

export const columns: IColumns = [
  'id',
  'email',
  'browser_ip',
  'browser_user_agent',
  'kujo_imported_date',
  'created_date',
  'cancel_reason',
  'cancelled_date',
  'closed_date',
  'processed_date',
  'updated_date',
  'note',
  'subtotal_price',
  'taxes_included',
  'total_discounts',
  'total_price',
  'total_tax',
  'total_weight',
  'order_status_url',
  { column: 'utm_source_id', references: UtmSource },
  'utm_medium_id',
  'utm_campaign',
  'utm_content',
  'utm_term'
];

export class Order implements IModel {
  id: number;
  email: string;
  browserIp: number;
  browserUserAgent: number;
  kujoImportedDate: Date;
  createdDate: Date;
  cancelReason: string;
  cancelledDate: Date;
  closedDate: Date;
  processedDate: Date;
  updatedDate: Date;
  note: string;
  subtotalPrice: number;
  taxesIncluded: boolean;
  totalDiscounts: number;
  totalPrice: number;
  totalTax: number;
  totalWeight: number;
  orderStatusUrl: string;
  utmSourceId: number;
  utmSource?: UtmSource;
  utmMediumId: number;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;

  constructor(props: any) {
    this.id = props.id;
    this.browserIp = props.browserIp;
    this.browserUserAgent = props.browserUserAgent;
    this.kujoImportedDate = props.kujoImportedDate;
    this.createdDate = props.createdDate;
    this.cancelReason = props.cancelReason;
    this.cancelledDate = props.cancelledDate;
    this.closedDate = props.closedDate;
    this.processedDate = props.processedDate;
    this.updatedDate = props.updatedDate;
    this.note = props.note;
    this.subtotalPrice = props.subtotalPrice;
    this.taxesIncluded = props.taxesIncluded;
    this.totalDiscounts = props.totalDiscounts;
    this.totalPrice = props.totalPrice;
    this.totalTax = props.totalTax;
    this.totalWeight = props.totalWeight;
    this.orderStatusUrl = props.orderStatusUrl;
    this.utmSourceId = props.utmSourceId;
    this.utmSource = props.utmSource;
    this.utmMediumId = props.utmMedium;
    this.utmCampaign = props.utmCampaign;
    this.utmContent = props.utmContent;
    this.utmTerm = props.utmTerm;
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

export const orderEntity = {
  tableName,
  columns,
  Model: Order,
  Collection: Orders
};
