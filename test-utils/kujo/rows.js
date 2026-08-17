/* eslint-disable global-require */
/* Captured result sets for the kujo fixtures (see README.md in this
 * directory for provenance). The big joined sets are stored gzipped - they
 * are ~90% repeated parent columns and compress two orders of magnitude -
 * and parsed lazily, once.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const cache = {};
const loadGz = (name) => {
  if (!cache[name]) {
    cache[name] = JSON.parse(
      zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'data', name)))
    );
  }
  return cache[name];
};

module.exports = {
  // The retail product page's variant query: 2394 rows x 68 columns over 11
  // entities, one page render's worth for kujo's biggest product.
  productPageRetail: () => loadGz('product-page-retail.json.gz'),
  // The same page for a logged-in wholesaler: + catalog_product_variant.
  productPageWholesale: () => loadGz('product-page-wholesale.json.gz'),
  // A typical mid-sized product's page (288 rows).
  productPageMid: () => loadGz('product-page-mid.json.gz'),
  // A heavy wholesale account's order-history page: 101 rows x 174 columns
  // over 12 entities, 62 order roots. Sanitized.
  accountOrders: () => loadGz('account-orders.json.gz'),
  // One parcel-tracking lookup: 9 rows x 183 columns over 17 entities,
  // reduced to a single root. Sanitized.
  parcelTracking: () => require('./data/parcel-tracking.json'),
  // The product page's small side queries, in the shapes kujo issues them.
  sizes: () => require('./data/sizes.json'),
  colors: () => require('./data/colors.json'),
  product: () => require('./data/product.json'),
  instagrams: () => require('./data/instagrams.json'),
  productNotes: () => require('./data/product-notes.json'),
  productFeatures: () => require('./data/product-features.json'),
  productSpecifications: () => require('./data/product-specifications.json')
};
