/* eslint-disable max-len */
import orm from '../test-utils/order/orm';
import ormA from '../test-utils/order/orm';
import ormB from '../test-utils/blog/orm';
import ormC from '../test-utils/order-more/orm';
import ormD from '../test-utils/nine/orm';
import ormE from '../test-utils/five/orm';
import ormF from '../test-utils/six/orm';
import ormG from '../test-utils/twelve/orm';
import ormH from '../test-utils/thirteen/orm';
import { Articles } from '../test-utils/blog/models/article';
const two = require('../test-utils/two/results');
const three = require('../test-utils/three/results');
const one = require('../test-utils/one/results.json');
const four = require('../test-utils/four/results.json');
const five = require('../test-utils/five/results.json');
const six = require('../test-utils/six/results.json');
const seven = require('../test-utils/seven/results.json');
const eight = require('../test-utils/eight/results.json');
const nine = require('../test-utils/nine/results.json');
const ten = require('../test-utils/ten/results.json');
const eleven = require('../test-utils/eleven/results.json');
const twelve = require('../test-utils/twelve/results.json');
const thirteen = require('../test-utils/thirteen/results.json');

test('Bo#parseFromDatabase where multiple rows reduce to one nested object (with all one-to-one or one-to-many tables)', () => {
  const order = ormA.createOneFromDatabase(one);
  expect(Array.isArray(order)).toBe(false);
  expect(order.id).toEqual(3866);
  expect(order.utmSource.id).toEqual(6);
  expect(order.lineItems.models.length).toEqual(6);

  expect(order.lineItems.models[0].id).toEqual(2271);
  expect(order.lineItems.models[0].productVariant.id).toEqual(163);
  expect(order.lineItems.models[0].productVariant.product.id).toEqual(1);

  expect(order.lineItems.models[1].id).toEqual(2272);
  expect(order.lineItems.models[1].productVariant.id).toEqual(186);
  expect(order.lineItems.models[1].productVariant.product.id).toEqual(1);

  expect(order.lineItems.models[2].id).toEqual(2273);
  expect(order.lineItems.models[2].productVariant.id).toEqual(213);
  expect(order.lineItems.models[2].productVariant.product.id).toEqual(1);

  expect(order.lineItems.models[3].id).toEqual(2274);
  expect(order.lineItems.models[3].productVariant.id).toEqual(207);
  expect(order.lineItems.models[3].productVariant.product.id).toEqual(1);

  expect(order.lineItems.models[4].id).toEqual(2275);
  expect(order.lineItems.models[4].productVariant.id).toEqual(296);
  expect(order.lineItems.models[4].productVariant.product.id).toEqual(5);

  expect(order.lineItems.models[5].id).toEqual(2276);
  expect(order.lineItems.models[5].productVariant.id).toEqual(308);
  expect(order.lineItems.models[5].productVariant.product.id).toEqual(3);
});

test('Bo#parseFromDatabase where multiple rows reduce to one nested object (with many-to-many tables)', () => {
  const article = ormB.createOneFromDatabase(two);
  expect(Array.isArray(article)).toBe(false);
  expect(article.id).toEqual(14);
  expect(article.person.id).toEqual(8);
  expect(article.articleTags.models.length).toEqual(10);

  expect(article.articleTags.models[0].id).toEqual(36);
  expect(article.articleTags.models[0].tag.id).toEqual(3);
  expect(article.articleTags.models[1].id).toEqual(37);
  expect(article.articleTags.models[1].tag.id).toEqual(4);
  expect(article.articleTags.models[2].id).toEqual(38);
  expect(article.articleTags.models[2].tag.id).toEqual(5);
  expect(article.articleTags.models[3].id).toEqual(39);
  expect(article.articleTags.models[3].tag.id).toEqual(6);
  expect(article.articleTags.models[4].id).toEqual(40);
  expect(article.articleTags.models[4].tag.id).toEqual(7);
  expect(article.articleTags.models[5].id).toEqual(41);
  expect(article.articleTags.models[5].tag.id).toEqual(8);
  expect(article.articleTags.models[6].id).toEqual(42);
  expect(article.articleTags.models[6].tag.id).toEqual(9);
  expect(article.articleTags.models[7].id).toEqual(43);
  expect(article.articleTags.models[7].tag.id).toEqual(11);
  expect(article.articleTags.models[8].id).toEqual(44);
  expect(article.articleTags.models[8].tag.id).toEqual(12);
  expect(article.articleTags.models[9].id).toEqual(45);
  expect(article.articleTags.models[9].tag.id).toEqual(16);
});

test('Bo#parseFromDatabase where multiple rows reduce to many rows with nested objects (with many-to-many tables)', () => {

  const articles = ormB.createFromDatabase(three);
  expect(Array.isArray(articles.models)).toBe(true);
  expect(articles instanceof Articles).toBe(true);
  expect(articles.models.length).toEqual(2);

  const first = articles.models[0];
  expect(first.person.id).toEqual(8);
  expect(first.articleTags.models.length).toEqual(10);

  expect(first.articleTags.models[0].id).toEqual(36);
  expect(first.articleTags.models[0].tag.id).toEqual(3);
  expect(first.articleTags.models[1].id).toEqual(37);
  expect(first.articleTags.models[1].tag.id).toEqual(4);
  expect(first.articleTags.models[2].id).toEqual(38);
  expect(first.articleTags.models[2].tag.id).toEqual(5);
  expect(first.articleTags.models[3].id).toEqual(39);
  expect(first.articleTags.models[3].tag.id).toEqual(6);
  expect(first.articleTags.models[4].id).toEqual(40);
  expect(first.articleTags.models[4].tag.id).toEqual(7);
  expect(first.articleTags.models[5].id).toEqual(41);
  expect(first.articleTags.models[5].tag.id).toEqual(8);
  expect(first.articleTags.models[6].id).toEqual(42);
  expect(first.articleTags.models[6].tag.id).toEqual(9);
  expect(first.articleTags.models[7].id).toEqual(43);
  expect(first.articleTags.models[7].tag.id).toEqual(11);
  expect(first.articleTags.models[8].id).toEqual(44);
  expect(first.articleTags.models[8].tag.id).toEqual(12);
  expect(first.articleTags.models[9].id).toEqual(45);
  expect(first.articleTags.models[9].tag.id).toEqual(16);

  const second = articles.models[1];
  expect(second.id).toEqual(12);
  expect(second.person.id).toEqual(17);
  expect(second.articleTags.models.length).toEqual(3);

  expect(second.articleTags.models[0].id).toEqual(33);
  expect(second.articleTags.models[0].tag.id).toEqual(1);
  expect(second.articleTags.models[1].id).toEqual(34);
  expect(second.articleTags.models[1].tag.id).toEqual(5);
  expect(second.articleTags.models[2].id).toEqual(35);
  expect(second.articleTags.models[2].tag.id).toEqual(15);
});

// Tests for where a deeply nested node which points to a node, is itself
// reused (not recreated each time) so that nodes pointing to it all stack
// together on it, rather than each attaching to different replica nodes
// which overwrite themselves on the node it points to.
// The example here is with the productVariant node being reused so that
// productVariantImages append to it, instead of each productVariantImage
// living on its own productVariant (which would keep overwriting itself
// on the actualProductVariant node).
test('Bo#parseFromDatabase where node is already seen', () => {
  const inventoryLevels = ormC.createFromDatabase(four);

  const first = inventoryLevels.models[0];
  expect(first.id).toEqual(15);
  expect(first.actualProductVariant.id).toEqual(120);
  expect(first.actualProductVariant.productVariants.models.length).toEqual(1);
  expect(first.actualProductVariant.productVariants.models[0].actualProductVariantId).toEqual(120);
  // I think the above test is good enough, and not sure I actual care about below
  // expect(first.actualProductVariant.productVariants.models[0].actualProductVariant.id).toEqual(120);
  expect(first.actualProductVariant.productVariants.models[0].id).toEqual(199);
  expect(first.actualProductVariant.productVariants.models[0].color.id).toEqual(1);
  expect(first.actualProductVariant.productVariants.models[0].gender.id).toEqual(1);
  expect(first.actualProductVariant.productVariants.models[0].product.id).toEqual(1);
  expect(first.actualProductVariant.productVariants.models[0].size.id).toEqual(4);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models.length).toEqual(7);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[0].id).toEqual(621);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[1].id).toEqual(709);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[2].id).toEqual(797);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[3].id).toEqual(885);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[4].id).toEqual(973);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[5].id).toEqual(1061);
  expect(first.actualProductVariant.productVariants.models[0].productVariantImages.models[6].id).toEqual(1149);

  const second = inventoryLevels.models[1];
  expect(second.id).toEqual(35);
  expect(second.actualProductVariant.id).toEqual(125);
  expect(second.actualProductVariant.productVariants.models.length).toEqual(1);
  expect(second.actualProductVariant.productVariants.models[0].actualProductVariantId).toEqual(125);
  // I think the above test is good enough, and not sure I actual care about below
  // expect(second.actualProductVariant.productVariants.models[0].actualProductVariant.id).toEqual(125);
  expect(second.actualProductVariant.productVariants.models[0].id).toEqual(209);
  expect(second.actualProductVariant.productVariants.models[0].color.id).toEqual(1);
  expect(second.actualProductVariant.productVariants.models[0].gender.id).toEqual(1);
  expect(second.actualProductVariant.productVariants.models[0].product.id).toEqual(1);
  expect(second.actualProductVariant.productVariants.models[0].size.id).toEqual(9);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models.length).toEqual(7);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[0].id).toEqual(679);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[1].id).toEqual(767);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[2].id).toEqual(855);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[3].id).toEqual(943);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[4].id).toEqual(1031);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[5].id).toEqual(1119);
  expect(second.actualProductVariant.productVariants.models[0].productVariantImages.models[6].id).toEqual(1207);
});

// Test for a nested object (eg, parcel) with objects in it that referenced to
// it (eg, parcel_events), correctly placing the objects (parcel_events) in
// its (parcel) collection of models, and not errantly placing the established
// parent node (parcel) as a direct reference of the child (parcel_event).
// For example: the errant behavior was:
// Parcel1
//   ParcelEvent1
//     Parcel1
//       ParcelEvent2
// Instead of:
// Parcel1
//   ParcelEvent1
//   ParcelEvent2
// NOTE: if this test ever breaks, you can widdle the five.json file to just
// the two relevant line items of the one relevant order. This test should
// be doing that, but since code coverage all-around isn't great and I already
// had this fuller json dump from production, I just used it all - YOLO.
test('Bo#parseFromDatabase where a deeply nested models property was misbehaving', () => {
  const orders = ormE.createFromDatabase(five);
  // The assertion that failed when the bug was present
  expect(
    orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models.length
  ).toEqual(2);
  // Lots of other assertions that are unrelated and shouldn't be here except
  // I'm insecure about the lack of tests so just going at it cause I can.
  expect(orders.models[0].id).toEqual(14219);
  expect(orders.models[0].email).toEqual('tswift@kujo.com');
  expect(orders.models[0].lineItems.models.length).toEqual(2);
  expect(orders.models[0].lineItems.models[0].id).toEqual(17298);
  expect(orders.models[0].lineItems.models[0].orderId).toEqual(14219);
  expect(orders.models[0].lineItems.models[1].id).toEqual(17297);
  expect(orders.models[0].lineItems.models[1].orderId).toEqual(14219);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models.length).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].id).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcelId).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].lineItemId).toEqual(17297);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.id).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models.length).toEqual(2);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[0].id).toEqual(3);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[0].parcelId).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[0].status).toEqual('in_transit');
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[1].id).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[1].parcelId).toEqual(1);
  expect(orders.models[0].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[1].status).toEqual('placed');
  expect(orders.models[1].id).toEqual(13888);
  expect(orders.models[1].email).toEqual('tswift@kujo.com');
  expect(orders.models[1].lineItems.models.length).toEqual(1);
  expect(orders.models[1].lineItems.models[0].id).toEqual(16900);
  expect(orders.models[1].lineItems.models[0].orderId).toEqual(13888);
});

// Problem:
// Parcel
//  ParcelLineItem
//   LineItem
//    Order
//     Customer
//  ParcelLineItem
//   LineItem
//    [MISSING ORDER]
// Issue occcurs in nestClump
// Problem only surfaced when custom was included
test('Bo#parseOneFromDatabase where a deeply nested models property was misbehaving', () => {
  const parcel = ormF.createOneFromDatabase(six);
  // The assertion that failed when the bug was present
  expect(parcel.parcelLineItems.models[1].lineItem.order).toBeDefined();
  // Lots of other assertions that are unrelated and shouldn't be here except
  // I'm insecure about the lack of tests so just going at it cause I can.
  expect(parcel.id).toEqual(1);
  expect(parcel.parcelLineItems.models.length).toEqual(2);
  expect(parcel.parcelLineItems.models[0].id).toEqual(604);
  expect(parcel.parcelLineItems.models[0].lineItem.id).toEqual(17298);
  expect(parcel.parcelLineItems.models[0].lineItem.order.id).toEqual(14219);
  expect(parcel.parcelLineItems.models[0].lineItem.order.customer.id).toEqual(5390);
  expect(parcel.parcelLineItems.models[0].lineItem.order.customer.email).toEqual('tswift@kujo.com');
  expect(parcel.parcelLineItems.models[1].id).toEqual(605);
  expect(parcel.parcelLineItems.models[1].lineItem.id).toEqual(17297);
  expect(parcel.parcelLineItems.models[1].lineItem.order.id).toEqual(14219);
  expect(parcel.parcelLineItems.models[1].lineItem.order.customer.id).toEqual(5390);
  expect(parcel.parcelLineItems.models[1].lineItem.order.customer.email).toEqual('tswift@kujo.com');
});

// Problem:
// InventoryLevel
//  ActualProductVariant
//   ProductVariant(1)
//    Color
//      ProductVariant(2)
// Instead of:
// InventoryLevel
//  ActualProductVariant
//   ProductVariant
//    Color
//   ProductVariant(2)
//    Color
// Issue occcurs in nestClump
test('Bo#parseOneFromDatabase where a deeply nested models property was attaching to wrong parent', () => {
  const inventoryLevel = ormC.createOneFromDatabase(seven);
  // The assertion that failed when the bug was present
  expect(inventoryLevel.actualProductVariant.productVariants.models[1]).toBeDefined();
  // Lots of other assertions that are unrelated and shouldn't be here except
  // I'm insecure about the lack of tests so just going at it cause I can.
  expect(inventoryLevel.id).toEqual(30);
  expect(inventoryLevel.actualProductVariant.id).toEqual(15);
  expect(inventoryLevel.actualProductVariant.productVariants.models.length).toEqual(2);
  expect(inventoryLevel.actualProductVariant.productVariants.models[0].id).toEqual(179);
  expect(inventoryLevel.actualProductVariant.productVariants.models[0].color.id).toEqual(4);
  expect(inventoryLevel.actualProductVariant.productVariants.models[0].gender.id).toEqual(1);
  expect(inventoryLevel.actualProductVariant.productVariants.models[0].size.id).toEqual(8);
  expect(inventoryLevel.actualProductVariant.productVariants.models[1].id).toEqual(180);
  expect(inventoryLevel.actualProductVariant.productVariants.models[1].color.id).toEqual(4);
  expect(inventoryLevel.actualProductVariant.productVariants.models[1].gender.id).toEqual(2);
  expect(inventoryLevel.actualProductVariant.productVariants.models[1].size.id).toEqual(11);
});

// Problem:
// Shipment
//  ShipmentActualProductVariant
//   ActualProductVariant
//    ProductVariant(1)
//     Product
//      ProductVariant(2)
//  ShipmentActualProductVariant
//   ActualProductVariant
// Instead of:
// Shipment
//  ShipmentActualProductVariant
//   ActualProductVariant
//    ProductVariant(1)
//     Product
//  ShipmentActualProductVariant
//   ActualProductVariant
//    ProductVariant(2)
//     Product
// Issue occcurs in nestClump
test('Bo#parseOneFromDatabase where a deeply nested models property was attaching to wrong parent 2', () => {
  const shipments = ormC.createFromDatabase(eight);
  // The assertion that failed when the bug was present
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants).toBeDefined();
  // IN ADDITION TO ABOVE ASSERTION and helpful test description of what is
  // being tested, the below tests tease out some logic that was hitherto
  // incorrect. This "some logic" should be defined and have separate tests
  // and jazz, but my brain hurts so TLDR these below tests are important but
  // (somewhat?) unrelated to the example/assertion above. "Are you serious?!"
  expect(shipments.models.length).toEqual(2);

  expect(shipments.models[0].id).toEqual(19);
  expect(shipments.models[0].shipmentActualProductVariants.models.length).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].id).toEqual(25);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.id).toEqual(65);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models.length).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].id).toEqual(310);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].product.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].size.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].color.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].gender.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].id).toEqual(309);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].product.id).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].size.id).toEqual(4);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].color.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].gender.id).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].id).toEqual(26);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.id).toEqual(25);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models.length).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[0].id).toEqual(194);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[0].product.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[0].size.id).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[0].color.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[0].gender.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[1].id).toEqual(195);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[1].product.id).toEqual(2);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[1].size.id).toEqual(5);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[1].color.id).toEqual(1);
  expect(shipments.models[0].shipmentActualProductVariants.models[1].actualProductVariant.productVariants.models[1].gender.id).toEqual(2);
  expect(shipments.models[1].id).toEqual(18);
  expect(shipments.models[1].shipmentActualProductVariants.models.length).toEqual(1);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].id).toEqual(1);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.id).toEqual(25);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models.length).toEqual(2);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].id).toEqual(194);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].product.id).toEqual(1);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].size.id).toEqual(2);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].color.id).toEqual(1);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[0].gender.id).toEqual(1);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].id).toEqual(195);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].product.id).toEqual(2);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].size.id).toEqual(5);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].color.id).toEqual(1);
  expect(shipments.models[1].shipmentActualProductVariants.models[0].actualProductVariant.productVariants.models[1].gender.id).toEqual(2);

});

// Issue occcurs in nestClump
// Problem is with only top level nodes
test('Bo#parseFromDatabase with just top level nodes', () => {
  let featureSwitches;
  try {
    // This failed when the bug was present
    featureSwitches = ormD.createFromDatabase(nine);
  } catch (e) {
    expect(e).not.toBeDefined();
  }
  expect(featureSwitches).toBeDefined();
  // Lots of other assertions that are unrelated and shouldn't be here except
  // I'm insecure about the lack of tests so just going at it cause I can.
  expect(featureSwitches.models.length).toEqual(2);
  expect(featureSwitches.models[0].id).toEqual('google_one_tap_sign_in');
  expect(featureSwitches.models[1].id).toEqual('website_live_chat');
});

// Issue occcurs in nestClump
// Problem is when oldest parent is an empty join record and is not included
// which results in the oldest parent search returning -1 and parent heirarchy
// is thus messed up.
test('Bo#parseFromDatabase 10', () => {
  let orders;
  try {
    // This failed when the bug was present
    orders = ormC.createFromDatabase(ten);
  } catch (e) {
    expect(e).not.toBeDefined();
  }
  expect(orders).toBeDefined();
  // Lots of other assertions that are unrelated and shouldn't be here except
  // I'm insecure about the lack of tests so just going at it cause I can.
  expect(orders.models.length).toEqual(5);

  expect(orders.models[0].id).toEqual(24591);
  expect(orders.models[0].customer.id).toEqual(5390);
  expect(orders.models[0].physicalAddress.id).toEqual(48982);
  expect(orders.models[0].lineItems.models.length).toEqual(1);
  expect(orders.models[0].lineItems.models[0].id).toEqual(29883);
  expect(orders.models[0].lineItems.models[0].productVariant.id).toEqual(158);
  expect(orders.models[0].lineItems.models[0].productVariant.product.id).toEqual(1);
  expect(orders.models[0].lineItems.models[0].productVariant.size.id).toEqual(9);
  expect(orders.models[0].lineItems.models[0].productVariant.color.id).toEqual(3);
  expect(orders.models[0].lineItems.models[0].productVariant.gender.id).toEqual(1);
  expect(orders.models[0].lineItems.models[0].productVariant.productVariantImages.models.length).toEqual(1);
  expect(orders.models[0].lineItems.models[0].productVariant.productVariantImages.models[0].id).toEqual(17);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models.length).toEqual(1);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].id).toEqual(6100);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.id).toEqual(5942);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models.length).toEqual(14);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[0].id).toEqual(193775);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[1].id).toEqual(193774);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[2].id).toEqual(193773);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[3].id).toEqual(193425);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[4].id).toEqual(193424);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[5].id).toEqual(193423);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[6].id).toEqual(192713);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[7].id).toEqual(192712);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[8].id).toEqual(192711);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[9].id).toEqual(192709);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[10].id).toEqual(192171);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[11].id).toEqual(192170);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[12].id).toEqual(192169);
  expect(orders.models[0].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[13].id).toEqual(191790);
  expect(orders.models[1].id).toEqual(24589);
  expect(orders.models[1].customer.id).toEqual(5390);
  expect(orders.models[1].physicalAddress.id).toEqual(48982);
  expect(orders.models[1].lineItems.models.length).toEqual(1);
  expect(orders.models[1].lineItems.models[0].id).toEqual(29880);
  expect(orders.models[1].lineItems.models[0].productVariant.id).toEqual(158);
  expect(orders.models[1].lineItems.models[0].productVariant.product.id).toEqual(1);
  expect(orders.models[1].lineItems.models[0].productVariant.size.id).toEqual(9);
  expect(orders.models[1].lineItems.models[0].productVariant.color.id).toEqual(3);
  expect(orders.models[1].lineItems.models[0].productVariant.gender.id).toEqual(1);
  expect(orders.models[1].lineItems.models[0].productVariant.productVariantImages.models.length).toEqual(1);
  expect(orders.models[1].lineItems.models[0].productVariant.productVariantImages.models[0].id).toEqual(17);
  expect(orders.models[2].id).toEqual(24587);
  expect(orders.models[2].customer.id).toEqual(5390);
  expect(orders.models[2].physicalAddress.id).toEqual(28145);
  expect(orders.models[2].lineItems.models.length).toEqual(1);
  expect(orders.models[2].lineItems.models[0].id).toEqual(29877);
  expect(orders.models[2].lineItems.models[0].productVariant.id).toEqual(158);
  expect(orders.models[2].lineItems.models[0].productVariant.product.id).toEqual(1);
  expect(orders.models[2].lineItems.models[0].productVariant.size.id).toEqual(9);
  expect(orders.models[2].lineItems.models[0].productVariant.color.id).toEqual(3);
  expect(orders.models[2].lineItems.models[0].productVariant.gender.id).toEqual(1);
  expect(orders.models[2].lineItems.models[0].productVariant.productVariantImages.models.length).toEqual(1);
  expect(orders.models[2].lineItems.models[0].productVariant.productVariantImages.models[0].id).toEqual(17);
  expect(orders.models[2].lineItems.models[0].parcelLineItems.models.length).toEqual(1);
  expect(orders.models[2].lineItems.models[0].parcelLineItems.models[0].id).toEqual(6070);
  expect(orders.models[2].lineItems.models[0].parcelLineItems.models[0].parcel.id).toEqual(5914);
  expect(orders.models[2].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models.length).toEqual(1);
  expect(orders.models[2].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[0].id).toEqual(189194);
  expect(orders.models[3].id).toEqual(14219);
  expect(orders.models[3].customer.id).toEqual(5390);
  expect(orders.models[3].physicalAddress.id).toEqual(28145);
  expect(orders.models[3].lineItems.models.length).toEqual(2);
  expect(orders.models[3].lineItems.models[0].id).toEqual(17298);
  expect(orders.models[3].lineItems.models[0].productVariant.id).toEqual(353);
  expect(orders.models[3].lineItems.models[0].productVariant.product.id).toEqual(8);
  expect(orders.models[3].lineItems.models[0].productVariant.size.id).toEqual(20);
  expect(orders.models[3].lineItems.models[0].productVariant.color.id).toEqual(10);
  expect(orders.models[3].lineItems.models[0].productVariant.gender.id).toEqual(3);
  expect(orders.models[3].lineItems.models[0].productVariant.productVariantImages.models.length).toEqual(1);
  expect(orders.models[3].lineItems.models[0].productVariant.productVariantImages.models[0].id).toEqual(789);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models.length).toEqual(1);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models[0].id).toEqual(3338);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models[0].parcel.id).toEqual(3304);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models.length).toEqual(3);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[0].id).toEqual(87279);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[1].id).toEqual(87278);
  expect(orders.models[3].lineItems.models[0].parcelLineItems.models[0].parcel.parcelEvents.models[2].id).toEqual(84361);
  expect(orders.models[3].lineItems.models[1].id).toEqual(17297);
  expect(orders.models[3].lineItems.models[1].productVariant.id).toEqual(344);
  expect(orders.models[3].lineItems.models[1].productVariant.product.id).toEqual(6);
  expect(orders.models[3].lineItems.models[1].productVariant.size.id).toEqual(22);
  expect(orders.models[3].lineItems.models[1].productVariant.color.id).toEqual(8);
  expect(orders.models[3].lineItems.models[1].productVariant.gender.id).toEqual(3);
  expect(orders.models[3].lineItems.models[1].productVariant.productVariantImages.models.length).toEqual(1);
  expect(orders.models[3].lineItems.models[1].productVariant.productVariantImages.models[0].id).toEqual(780);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models.length).toEqual(1);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models[0].id).toEqual(2311);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models[0].parcel.id).toEqual(2317);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models.length).toEqual(3);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[0].id).toEqual(52627);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[1].id).toEqual(52626);
  expect(orders.models[3].lineItems.models[1].parcelLineItems.models[0].parcel.parcelEvents.models[2].id).toEqual(48326);
  expect(orders.models[4].id).toEqual(13888);
  expect(orders.models[4].customer.id).toEqual(5390);
  expect(orders.models[4].physicalAddress.id).toEqual(7608);
  expect(orders.models[4].lineItems.models.length).toEqual(1);
  expect(orders.models[4].lineItems.models[0].id).toEqual(16900);
  expect(orders.models[4].lineItems.models[0].productVariant.id).toEqual(363);
  expect(orders.models[4].lineItems.models[0].productVariant.product.id).toEqual(5);
  expect(orders.models[4].lineItems.models[0].productVariant.size.id).toEqual(8);
  expect(orders.models[4].lineItems.models[0].productVariant.color.id).toEqual(12);
  expect(orders.models[4].lineItems.models[0].productVariant.gender.id).toEqual(1);
  expect(orders.models[4].lineItems.models[0].productVariant.productVariantImages.models.length).toEqual(1);
  expect(orders.models[4].lineItems.models[0].productVariant.productVariantImages.models[0].id).toEqual(829);
});

// Issue occcurs in nestClump
// Problem from early returning not logging bo so parent hierarcy was missing it
test('Bo#parseFromDatabase 11', () => {
  let orders;
  try {
    // This failed when the bug was present
    orders = ormC.createFromDatabase(eleven);
  } catch (e) {
    expect(e).not.toBeDefined();
  }
  expect(orders).toBeDefined();
});

// Issue occcurs in nestClump
// Problem when a table references another model twice (two columns)
test('Bo#parseFromDatabase 12', () => {
  let prompt;
  try {
    // This failed when the bug was present
    prompt = ormG.createFromDatabase(twelve);
  } catch (e) {
    expect(e).not.toBeDefined();
  }
  expect(prompt).toBeDefined();
  // Ideally the below should work
  // expect(prompt.fromMember.id).toEqual(1);
});

// Issue occcurs in nestClump
// Problem when a table has records that are supposed to nest under root
// but nest under other stuff below it instead
// Member
//  Recommendations [1]
//   Brand
//    Recommendations [1]
//   Passion
//    Recommendations [2]
// -- instead of correct --
// Member
//  Recommendations[4]
//   Brand
//   Passion
test('Bo#parseFromDatabase 13', () => {
  const members = ormH.createFromDatabase(thirteen);
  const member = members.models[0];
  expect(member.recommendations.models.length).toEqual(4);
  expect(member.recommendations.models[0].brand.id).toEqual(2);
  expect(member.recommendations.models[0].product.id).toEqual(7);
  expect(member.recommendations.models[0].category.id).toEqual(1);
  expect(member.recommendations.models[0].recommendationAudiences.models[0].audience.id).toEqual(1);
  expect(member.recommendations.models[1].brand.id).toEqual(2);
  expect(member.recommendations.models[1].product.id).toEqual(1);
  expect(member.recommendations.models[1].category.id).toEqual(2);
  expect(member.recommendations.models[1].recommendationAudiences.models[0].audience.id).toEqual(1);
  expect(member.recommendations.models[2].brand.id).toEqual(3);
  expect(member.recommendations.models[2].product.id).toEqual(27);
  expect(member.recommendations.models[2].category.id).toEqual(3);
  expect(member.recommendations.models[2].recommendationAudiences.models[0].audience.id).toEqual(1);
  expect(member.recommendations.models[3].brand.id).toEqual(6);
  expect(member.recommendations.models[3].product.id).toEqual(75);
  expect(member.recommendations.models[3].category.id).toEqual(4);
  expect(member.recommendations.models[3].recommendationAudiences.models[0].audience.id).toEqual(1);
});

test('orm.tables', () => {
  expect(Object.keys(ormA.tables).length).toEqual(5);
  expect(ormA.tables.utmSource).toEqual('"utm_source".id as "utm_source#id", "utm_source".value as "utm_source#value", "utm_source".label as "utm_source#label", "utm_source".internal as "utm_source#internal"');
  expect(ormA.tables.order).toEqual('"order".id as "order#id", "order".email as "order#email", "order".browser_ip as "order#browser_ip", "order".browser_user_agent as "order#browser_user_agent", "order".kujo_imported_date as "order#kujo_imported_date", "order".created_date as "order#created_date", "order".cancel_reason as "order#cancel_reason", "order".cancelled_date as "order#cancelled_date", "order".closed_date as "order#closed_date", "order".processed_date as "order#processed_date", "order".updated_date as "order#updated_date", "order".note as "order#note", "order".subtotal_price as "order#subtotal_price", "order".taxes_included as "order#taxes_included", "order".total_discounts as "order#total_discounts", "order".total_price as "order#total_price", "order".total_tax as "order#total_tax", "order".total_weight as "order#total_weight", "order".order_status_url as "order#order_status_url", "order".utm_source_id as "order#utm_source_id", "order".utm_medium_id as "order#utm_medium_id", "order".utm_campaign as "order#utm_campaign", "order".utm_content as "order#utm_content", "order".utm_term as "order#utm_term"');
  expect(ormA.tables.lineItem).toEqual('"line_item".id as "line_item#id", "line_item".product_variant_id as "line_item#product_variant_id", "line_item".order_id as "line_item#order_id", "line_item".fulfillment_status_id as "line_item#fulfillment_status_id", "line_item".fulfillable_quantity as "line_item#fulfillable_quantity", "line_item".fulfillment_service as "line_item#fulfillment_service", "line_item".grams as "line_item#grams", "line_item".price as "line_item#price", "line_item".quantity as "line_item#quantity", "line_item".requires_shipping as "line_item#requires_shipping", "line_item".taxable as "line_item#taxable", "line_item".total_discount as "line_item#total_discount"');
  expect(ormA.tables.productVariant).toEqual('"product_variant".id as "product_variant#id", "product_variant".product_id as "product_variant#product_id", "product_variant".actual_product_variant_id as "product_variant#actual_product_variant_id", "product_variant".color_id as "product_variant#color_id", "product_variant".gender_id as "product_variant#gender_id", "product_variant".size_id as "product_variant#size_id", "product_variant".barcode as "product_variant#barcode", "product_variant".price as "product_variant#price", "product_variant".compare_at_price as "product_variant#compare_at_price", "product_variant".created_date as "product_variant#created_date", "product_variant".updated_date as "product_variant#updated_date", "product_variant".grams as "product_variant#grams", "product_variant".requires_shipping as "product_variant#requires_shipping"');
  expect(ormA.tables.product).toEqual('"product".id as "product#id", "product".vendor_id as "product#vendor_id", "product".value as "product#value", "product".label as "product#label", "product".product_type as "product#product_type", "product".created_date as "product#created_date", "product".updated_date as "product#updated_date", "product".published_date as "product#published_date", "product".category as "product#category"');
});
