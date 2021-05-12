const Order = require('../../examples/order/bo/order');
const Article = require('../../examples/blog/bo/article');
const Articles = require('../../examples/blog/bo/articles');
const InventoryLevel = require('../../examples/order-more/bo/inventory-level');
const one = require('../../test-utils/one/results.json');
const two = require('../../test-utils/two/results');
const three = require('../../test-utils/three/results');
const four = require('../../test-utils/four/results.json');
const Order5 = require('../../test-utils/five/bo/order');
const five = require('../../test-utils/five/results.json');

test('Bo#parseFromDatabase where multiple rows reduce to one nested object (with all one-to-one or one-to-many tables)', () => {
  const order = Order.createOneFromDatabase(one);
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
  const article = Article.createOneFromDatabase(two);
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

  const articles = Article.createFromDatabase(three);
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
  const inventoryLevels = InventoryLevel.createFromDatabase(four);

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
  const orders = Order5.createFromDatabase(five);
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
