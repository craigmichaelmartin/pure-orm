const BaseBo = require('./base');
const Orders = require('./orders');
const UtmSource = require('./utm-source');

class Order extends BaseBo {
  get Bo() {
    return Order;
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
      {column: 'utm_source_id', references: UtmSource},
      'utm_campaign',
      'utm_content',
      'utm_term',
    ];
  }

}

module.exports = Order;
