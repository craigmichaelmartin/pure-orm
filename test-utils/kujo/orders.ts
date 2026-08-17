/* The kujo order domain, mirrored from the application's models/ directory as
 * of 2026-08-16. Notable real-world shapes preserved here:
 * - `order` is 46 columns wide (past the ORM's 30-column bit-mask limit for
 *   the SQL-helper shape caches) and references the same entity twice
 *   (shipping and billing address).
 * - `customer` references `person` twice (affiliate and sales manager).
 * - `line_item.columns` is a function that lazily requires ExchangeLineItem,
 *   because the two models require each other.
 * - `LineItem`'s constructor derives a localized price string, so model
 *   construction is not free.
 */
import { Base, BaseCollection } from './base';
import { IColumns } from '../../src/index';
import {
  ProductVariant,
  ActualProductVariant,
  PhysicalAddress,
  Catalog
} from './catalog';

export class CustomerSource extends Base {}
export class CustomerSources extends BaseCollection {}
export const customerSourceEntity = {
  tableName: 'customer_source',
  columns: ['id', 'value', 'label', 'position', 'show'] as IColumns,
  Model: CustomerSource,
  Collection: CustomerSources
};

export class CustomerType extends Base {}
export class CustomerTypes extends BaseCollection {}
export const customerTypeEntity = {
  tableName: 'customer_type',
  columns: ['id', 'value', 'label', 'position', 'show'] as IColumns,
  Model: CustomerType,
  Collection: CustomerTypes
};

export class PaymentTerms extends Base {}
export class PaymentTermss extends BaseCollection {}
export const paymentTermsEntity = {
  tableName: 'payment_terms',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: PaymentTerms,
  Collection: PaymentTermss
};

/* kujo's models/shipping-terms.ts declares tableName 'payment_terms' (a
 * latent copy-paste bug there; nothing selects shipping terms columns today).
 * The fixture uses the real table name so entity registration stays sane.
 */
export class ShippingTerms extends Base {}
export class ShippingTermss extends BaseCollection {}
export const shippingTermsEntity = {
  tableName: 'shipping_terms',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: ShippingTerms,
  Collection: ShippingTermss
};

export class Wholesaler extends Base {}
export class Wholesalers extends BaseCollection {}
export const wholesalerEntity = {
  tableName: 'wholesaler',
  columns: [
    'id',
    'name',
    'value',
    'is_retailer',
    'logo_url',
    'uses_wholesale_form',
    'inventory_alert_email_addresses',
    'requires_special_fulfillment',
    { column: 'payment_terms_id', references: PaymentTerms },
    { column: 'shipping_terms_id', references: ShippingTerms },
    { column: 'catalog_id', references: Catalog },
    'purchase_order_billing_company',
    'purchase_order_billing_email',
    'purchase_order_name_prefix',
    'dropshipper'
  ] as IColumns,
  Model: Wholesaler,
  Collection: Wholesalers
};

export class Person extends Base {}
export class Persons extends BaseCollection {}
export const personEntity = {
  tableName: 'person',
  columns: [
    'id',
    'first_name',
    'last_name',
    'username',
    'password',
    'slug',
    'email',
    'picture',
    'cover_photo',
    'brand',
    'tagline',
    'display_name',
    'biography',
    'title',
    'website',
    'twitter',
    'facebook',
    'instagram',
    'youtube',
    'superuser',
    'admin',
    'fulfillment',
    'marketer',
    'affiliate',
    'affiliate_code',
    'affiliate_commission',
    'last_paid_date',
    'sales_manager',
    'sales_manager_commission',
    'pay_frequency',
    'wholesaler',
    'shopify_customer_account_refresh_token',
    { column: 'wholesaler_id', references: Wholesaler }
  ] as IColumns,
  Model: Person,
  Collection: Persons
};

export class Customer extends Base {}
export class Customers extends BaseCollection {}
export const customerEntity = {
  tableName: 'customer',
  columns: [
    'id',
    'shopify_id',
    'email',
    'phone',
    'first_name',
    'last_name',
    { column: 'customer_source_id', references: CustomerSource },
    { column: 'customer_type_id', references: CustomerType },
    { column: 'locked_to_affiliate_id', references: Person },
    'birth_year',
    'sex',
    'nps',
    'blocked_from_purchasing',
    'is_kujo_pro',
    'created_date',
    'updated_date',
    { column: 'locked_to_sales_manager_id', references: Person }
  ] as IColumns,
  Model: Customer,
  Collection: Customers
};

export class FinancialStatus extends Base {}
export class FinancialStatuses extends BaseCollection {}
export const financialStatusEntity = {
  tableName: 'financial_status',
  columns: ['id', 'value', 'label', 'description'] as IColumns,
  Model: FinancialStatus,
  Collection: FinancialStatuses
};

export class FulfillmentStatus extends Base {}
export class FulfillmentStatuses extends BaseCollection {}
export const fulfillmentStatusEntity = {
  tableName: 'fulfillment_status',
  columns: ['id', 'value', 'label', 'description'] as IColumns,
  Model: FulfillmentStatus,
  Collection: FulfillmentStatuses
};

export class UtmSource extends Base {}
export class UtmSources extends BaseCollection {}
export const utmSourceEntity = {
  tableName: 'utm_source',
  columns: ['id', 'value', 'label', 'internal'] as IColumns,
  Model: UtmSource,
  Collection: UtmSources
};

export class UtmMedium extends Base {}
export class UtmMediums extends BaseCollection {}
export const utmMediumEntity = {
  tableName: 'utm_medium',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: UtmMedium,
  Collection: UtmMediums
};

export class Order extends Base {}
export class Orders extends BaseCollection {}
export const orderEntity = {
  tableName: 'order',
  columns: [
    'id',
    { column: 'wholesaler_id', references: Wholesaler },
    { column: 'customer_id', references: Customer },
    { column: 'affiliate_id', references: Person },
    'affiliate_earning',
    { column: 'financial_status_id', references: FinancialStatus },
    { column: 'shipping_address_id', references: PhysicalAddress },
    'shipping_first_name',
    'shipping_last_name',
    'shipping_company',
    'shipping_phone',
    { column: 'billing_address_id', references: PhysicalAddress },
    'billing_first_name',
    'billing_last_name',
    'billing_company',
    'billing_phone',
    'shopify_id',
    'shopify_name',
    'shopify_number',
    'shopify_token',
    'warehouse_order_id',
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
    { column: 'utm_medium_id', references: UtmMedium },
    'utm_campaign',
    'utm_content',
    'utm_term',
    'shipping_selection',
    'cancelled'
  ] as IColumns,
  Model: Order,
  Collection: Orders
};

export class LineItem extends Base {
  constructor(props: any) {
    super(props);
    this._initializeDerivedData();
  }

  _initializeDerivedData(): void {
    if (this.price) {
      this.priceLocale = (+this.price).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      });
    }
  }
}
export class LineItems extends BaseCollection {}
export const lineItemEntity = {
  tableName: 'line_item',
  columns: (() => {
    // Lazy: LineItem and ExchangeLineItem reference each other (as in kujo).
    const { ExchangeLineItem } = require('./parcels'); // eslint-disable-line
    return [
      'id',
      { column: 'fulfillment_status_id', references: FulfillmentStatus },
      { column: 'product_variant_id', references: ProductVariant },
      { column: 'actual_product_variant_id', references: ActualProductVariant },
      { column: 'order_id', references: Order },
      { column: 'from_exchange_line_item_id', references: ExchangeLineItem },
      'shopify_id',
      'fulfillable_quantity',
      'fulfillment_service',
      'grams',
      'price',
      'quantity',
      'requires_shipping',
      'taxable',
      'total_discount',
      'review_prompted_date'
    ];
  }) as IColumns,
  Model: LineItem,
  Collection: LineItems
};
