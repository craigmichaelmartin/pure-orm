const Orders = require('./orders');
const UtmSource = require('./utm-source');
const Customer = require('./customer');
const PhysicalAddress = require('./physical-address');

class Order {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Orders;
  }

  static get tableName() {
    return 'order';
  }

  static get sqlColumnsData() {
    return [
      'id',
      'email',
      { column: 'customer_id', references: Customer },
      { column: 'shipping_address_id', references: PhysicalAddress },
      { column: 'billing_address_id', references: PhysicalAddress },
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
  }
}

module.exports = Order;
