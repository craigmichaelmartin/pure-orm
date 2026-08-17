/* Structural correctness over the kujo fixtures: real result sets from
 * pure-orm's heaviest production consumer (see test-utils/kujo/README.md).
 * These pin the object graphs the application actually renders from, so
 * optimization work inside createFromDatabase can be checked against reality
 * rather than only against hand-built shapes.
 */
import { createCore, ICollection, IModel } from './core';
import { entities } from '../test-utils/kujo/entities';
import {
  Product,
  ProductVariant,
  ActualProductVariant,
  Color,
  InventoryLevels,
  Shipment
} from '../test-utils/kujo/catalog';
import { Order, Customer, LineItem } from '../test-utils/kujo/orders';
import { Parcel, ExchangeLineItem } from '../test-utils/kujo/parcels';
const rows = require('../test-utils/kujo/rows');

const firstSeen = (rowList: Array<any>, key: string): Array<any> => {
  const seen = new Set();
  const order: Array<any> = [];
  for (const row of rowList) {
    const value = row[key];
    if (value !== null && value !== undefined && !seen.has(value)) {
      seen.add(value);
      order.push(value);
    }
  }
  return order;
};

describe('kujo product page', () => {
  const core = createCore({ entities });

  test('the retail variant query reduces to the page graph', () => {
    const retail = rows.productPageRetail();
    const variants = core.createFromDatabase<ICollection<IModel>>(retail);

    // 2394 rows -> 119 roots, in first-seen order.
    expect(retail.length).toEqual(2394);
    expect(variants.models.length).toEqual(119);
    expect(variants.models.map((m: any) => m.id)).toEqual(
      firstSeen(retail, 'actual_product_variant#id')
    );

    const first: any = variants.models[0];
    expect(first).toBeInstanceOf(ActualProductVariant);
    expect(first.id).toEqual(65);
    expect(first.sku).toEqual('10010150');

    // One product variant, holding the images the page renders, in the
    // query's ORDER BY order even though the root's rows arrive in runs.
    expect(first.productVariants.models.length).toEqual(1);
    const variant = first.productVariants.models[0];
    expect(variant).toBeInstanceOf(ProductVariant);
    expect(variant.id).toEqual(438);
    expect(variant.price).toEqual('135');
    expect(
      variant.productVariantImages.models.map((image: any) => image.id)
    ).toEqual([3643, 3660, 3677, 3694, 3711, 3728, 3745]);
    expect(
      variant.productVariantImages.models.map((image: any) => image.position)
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // Every image points back at the one variant instance, not at replicas.
    for (const image of variant.productVariantImages.models) {
      expect(image.productVariant).toBe(variant);
    }

    // Lookup entities resolve within the root scope.
    expect(variant.product).toBeInstanceOf(Product);
    expect(variant.product.id).toEqual(11);
    expect(variant.product.value).toEqual('kujo_yard_shoe');
    expect(variant.color).toBeInstanceOf(Color);
    expect(variant.color.id).toEqual(1);
    expect(variant.size.id).toEqual(26);
    expect(variant.actualProductVariant).toBe(first);

    // gender is joined but null on every row: no models, no property.
    expect(variant.gender).toBeUndefined();

    // Inventory levels dedupe under the fan-out, and kujo's domain getter
    // works on the ORM-built collection.
    expect(first.inventoryLevels).toBeInstanceOf(InventoryLevels);
    expect(
      first.inventoryLevels.models.map((level: any) => [
        level.id,
        level.available
      ])
    ).toEqual([
      [534, 0],
      [282, 0],
      [3, 5]
    ]);
    expect(first.inventoryLevels.totalAvailable).toEqual(5);
    for (const level of first.inventoryLevels.models) {
      expect(level.actualProductVariant).toBe(first);
    }

    // shipment_actual_product_variant fans out, while shipment itself is
    // nulled by its ON-clause date filter: linked rows, no shipment model.
    expect(
      first.shipmentActualProductVariants.models.map((sapv: any) => sapv.id)
    ).toEqual([2832]);
    expect(
      first.shipmentActualProductVariants.models[0].shipment
    ).toBeUndefined();
    const totalSapvs = variants.models.reduce(
      (sum: number, root: any) =>
        sum +
        (root.shipmentActualProductVariants
          ? root.shipmentActualProductVariants.models.length
          : 0),
      0
    );
    expect(totalSapvs).toEqual(87);

    // Models dedupe per root scope, so each root materializes its own copy
    // of the shared product row.
    const second: any = variants.models[1];
    expect(second.id).toEqual(25);
    const secondProduct = second.productVariants.models[0].product;
    expect(secondProduct.id).toEqual(11);
    expect(secondProduct).not.toBe(variant.product);

    // The full page graph serializes without cycles (back-reference
    // collections are non-enumerable).
    expect(() => JSON.stringify(variants.models)).not.toThrow();
    const serialized = JSON.parse(JSON.stringify(first));
    expect(serialized.inventoryLevels).toBeUndefined();
    expect(serialized.sku).toEqual('10010150');
  });

  test('the wholesale variant query adds catalog pricing per variant', () => {
    const wholesale = rows.productPageWholesale();
    const variants = core.createFromDatabase<ICollection<IModel>>(wholesale);
    expect(variants.models.length).toEqual(119);
    const variant = (variants.models[0] as any).productVariants.models[0];
    expect(variant.catalogProductVariants.models.length).toEqual(1);
    const catalogVariant = variant.catalogProductVariants.models[0];
    expect(catalogVariant.id).toEqual(1007);
    expect(catalogVariant.price).toEqual('74');
    expect(catalogVariant.productVariant).toBe(variant);
    // catalog itself is joined for filtering but never selected.
    expect(catalogVariant.catalog).toBeUndefined();
  });

  test('a mid-sized product reduces the same way', () => {
    const mid = rows.productPageMid();
    const variants = core.createFromDatabase<ICollection<IModel>>(mid);
    expect(mid.length).toEqual(288);
    expect(variants.models.length).toEqual(12);
    expect(
      (variants.models[0] as any).productVariants.models[0].product.value
    ).toEqual('kujo_yard_shorts');
  });

  test('a full page render rotates eight query shapes through one core', () => {
    // The page issues one giant query and seven small ones; the plan cache
    // must keep them straight when a server renders page after page.
    const renderOnce = () => {
      const variants = core.createFromDatabase<ICollection<IModel>>(
        rows.productPageRetail()
      );
      const product = core.createOneFromDatabase<IModel>(rows.product());
      const sizes = core.createFromDatabase<ICollection<IModel>>(rows.sizes());
      const colors = core.createFromDatabase<ICollection<IModel>>(
        rows.colors()
      );
      const instagrams = core.createFromDatabase<ICollection<IModel>>(
        rows.instagrams()
      );
      const notes = core.createFromDatabase<ICollection<IModel>>(
        rows.productNotes()
      );
      const features = core.createFromDatabase<ICollection<IModel>>(
        rows.productFeatures()
      );
      const specifications = core.createFromDatabase<ICollection<IModel>>(
        rows.productSpecifications()
      );
      return {
        variants,
        product,
        sizes,
        colors,
        instagrams,
        notes,
        features,
        specifications
      };
    };

    for (let pass = 0; pass < 2; pass++) {
      const page = renderOnce();
      expect(page.variants.models.length).toEqual(119);

      // orm.getMatching(new Product({...})) resolves through
      // createOneFromDatabase, snake_case to camelCase included.
      expect((page.product as any).id).toEqual(11);
      expect((page.product as any).usesColistedGenderShoeSizes).toEqual(true);
      expect((page.product as any).defaultFitId).toEqual(3);

      // sizes and colors are hand-aliased partial column lists.
      expect(page.sizes.models.length).toEqual(18);
      expect((page.sizes.models[0] as any).id).toEqual(26);
      expect((page.sizes.models[0] as any).label).toEqual(
        '5 Mens / 6.5 Womens'
      );
      expect((page.sizes.models[0] as any).value).toEqual(
        '5 Mens / 6.5 Womens'
      );
      expect(page.colors.models.map((color: any) => color.id)).toEqual([
        1, 14, 13, 4, 3, 2, 27
      ]);

      expect(page.instagrams.models.map((post: any) => post.id)).toEqual([
        21, 30, 22, 23
      ]);
      expect(page.features.models.length).toEqual(11);
      expect(
        page.features.models.map((feature: any) => feature.position)
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      expect(page.specifications.models.length).toEqual(18);
      expect((page.specifications.models[0] as any).specKey).toEqual(
        'Footwear Height'
      );

      // Notes carry an optional color: two resolve, one has none.
      expect(
        page.notes.models.map((note: any) => [
          note.id,
          note.color ? note.color.id : undefined
        ])
      ).toEqual([
        [1, 4],
        [2, 13],
        [6, undefined]
      ]);
    }
  });
});

describe('kujo account orders', () => {
  const core = createCore({ entities });

  test('the order-history query reduces to one page of orders', () => {
    const history = rows.accountOrders();
    const orders = core.createFromDatabase<ICollection<IModel>>(history);

    expect(history.length).toEqual(101);
    expect(orders.models.length).toEqual(62);
    expect(orders.models.map((order: any) => order.id)).toEqual(
      firstSeen(history, 'order#id')
    );

    const first: any = orders.models[0];
    expect(first).toBeInstanceOf(Order);
    expect(first.id).toEqual(9342);
    expect(first.totalPrice).toEqual('90');
    expect(first.lineItems.models.length).toEqual(1);

    // The same customer re-materializes per root scope: same id, distinct
    // instances, each carrying its scope's order in its back-reference.
    expect(first.customer).toBeInstanceOf(Customer);
    expect(first.customer.id).toEqual(13083);
    const second: any = orders.models[1];
    expect(second.customer.id).toEqual(13083);
    expect(second.customer).not.toBe(first.customer);
    expect(first.customer.orders.models).toEqual([first]);

    // Only the shipping address is joined; the billing id stays a plain
    // column and order.physicalAddress is the shipping row.
    expect(first.physicalAddress.id).toEqual(18392);
    expect(first.shippingAddressId).toEqual(18392);
    expect(first.billingAddressId).toEqual(2030);

    // person (affiliate) and utm_source/utm_medium are joined but never
    // match for this account.
    expect(first.person).toBeUndefined();
    expect(first.utmSource).toBeUndefined();

    // Every line item in this history predates variant mapping: the whole
    // product graph is joined and entirely null, so line items materialize
    // bare - no productVariant, no price, and the constructor-derived
    // priceLocale stays unset.
    const lineItems = orders.models.reduce(
      (all: Array<any>, order: any) =>
        all.concat(order.lineItems ? order.lineItems.models : []),
      []
    );
    expect(lineItems.length).toEqual(101);
    for (const lineItem of lineItems) {
      expect(lineItem).toBeInstanceOf(LineItem);
      expect(lineItem.productVariant).toBeUndefined();
      expect(lineItem.priceLocale).toBeUndefined();
    }

    // Fan-out spot check: an order with many line items keeps them all.
    const bulk = orders.models.find((order: any) => order.id === 9560) as any;
    expect(bulk.lineItems.models.length).toEqual(9);
  });
});

describe('kujo parcel tracking', () => {
  const core = createCore({ entities });

  test('the 17-entity parcel query reduces to a single root', () => {
    const tracking = rows.parcelTracking();
    expect(Object.keys(tracking[0]).length).toEqual(183);

    // Consumed through orm.one, which is createOneFromDatabase.
    const parcel: any = core.createOneFromDatabase<IModel>(tracking);
    expect(parcel).toBeInstanceOf(Parcel);
    expect(parcel.id).toEqual(32277);
    expect(parcel.kind).toEqual('original');

    expect(parcel.parcelLineItems.models.length).toEqual(3);
    const lineItems = parcel.parcelLineItems.models.map(
      (parcelLineItem: any) => parcelLineItem.lineItem
    );
    expect(lineItems.map((lineItem: any) => lineItem.id)).toEqual([
      47810, 47811, 47812
    ]);

    // Constructor-derived data materialized through the ORM.
    expect(lineItems[0].price).toEqual('28.35');
    expect(lineItems[0].priceLocale).toEqual('$28.35');
    expect(lineItems[2].priceLocale).toEqual('$24.35');

    // All three line items resolve to the one order, and the shared order
    // graph hangs off it once.
    for (const lineItem of lineItems) {
      expect(lineItem.order).toBe(lineItems[0].order);
    }
    const order = lineItems[0].order;
    expect(order.id).toEqual(37876);
    expect(order.customer.id).toEqual(33734);

    // shipping_address_id === billing_address_id here: both references
    // resolve to the same model, which must appear in the address's orders
    // back-reference exactly once.
    expect(order.shippingAddressId).toEqual(order.billingAddressId);
    expect(order.physicalAddress.id).toEqual(74608);
    expect(order.physicalAddress.orders.models.length).toEqual(1);

    // Each line item carries its exchange, whose desired variant points
    // outside the result set and so stays unresolved.
    for (const lineItem of lineItems) {
      expect(lineItem.exchangeLineItems.models.length).toEqual(1);
      const exchangeLineItem = lineItem.exchangeLineItems.models[0];
      expect(exchangeLineItem).toBeInstanceOf(ExchangeLineItem);
      expect(exchangeLineItem.lineItem).toBe(lineItem);
      expect(exchangeLineItem.desiredProductVariantId).toBeDefined();
      expect(exchangeLineItem.desiredProductVariant).toBeUndefined();
    }

    // The inventory fan-out that multiplies the rows dedupes back down.
    expect(
      lineItems.map(
        (lineItem: any) =>
          lineItem.productVariant.actualProductVariant.inventoryLevels.models
            .length
      )
    ).toEqual([3, 3, 3]);
  });

  test('createOneFromDatabase throws if a second parcel sneaks in', () => {
    const tracking = rows.parcelTracking();
    const foreign = { ...tracking[0], 'parcel#id': 99999 };
    expect(() => core.createOneFromDatabase([...tracking, foreign])).toThrow(
      'Got more than one.'
    );
  });
});

describe('kujo model construction contract', () => {
  test('constructors run exactly once per materialized model', () => {
    /* kujo derives data in constructors (LineItem.priceLocale,
     * Shipment.sellableDate*), so the ORM re-running one - on dedupe, on
     * linking, on a scope revisit - would silently change application
     * behavior. Counted here over a fan-out with revisited root scopes.
     */
    const counts = { root: 0, child: 0, lookup: 0 };
    class CountedRoot {
      [key: string]: any;
      constructor(props: any) {
        counts.root++;
        Object.assign(this, props);
      }
    }
    class CountedRoots {
      models: Array<any>;
      constructor({ models }: any) {
        this.models = models;
      }
    }
    class CountedChild {
      [key: string]: any;
      constructor(props: any) {
        counts.child++;
        Object.assign(this, props);
      }
    }
    class CountedChildren {
      models: Array<any>;
      constructor({ models }: any) {
        this.models = models;
      }
    }
    class CountedLookup {
      [key: string]: any;
      constructor(props: any) {
        counts.lookup++;
        Object.assign(this, props);
      }
    }
    class CountedLookups {
      models: Array<any>;
      constructor({ models }: any) {
        this.models = models;
      }
    }
    const core = createCore({
      entities: [
        {
          tableName: 'counted_root',
          columns: ['id'],
          Model: CountedRoot,
          Collection: CountedRoots
        },
        {
          tableName: 'counted_lookup',
          columns: ['id', 'label'],
          Model: CountedLookup,
          Collection: CountedLookups
        },
        {
          tableName: 'counted_child',
          columns: [
            'id',
            { column: 'root_id', references: CountedRoot },
            { column: 'lookup_id', references: CountedLookup }
          ],
          Model: CountedChild,
          Collection: CountedChildren
        }
      ]
    });

    // Two roots, interleaved so each scope is revisited; children repeat
    // across rows; one lookup shared by both children within each scope.
    const row = (
      rootId: number,
      childId: number,
      lookupId: number
    ): object => ({
      'counted_root#id': rootId,
      'counted_child#id': childId,
      'counted_child#root_id': rootId,
      'counted_child#lookup_id': lookupId,
      'counted_lookup#id': lookupId,
      'counted_lookup#label': `lookup-${lookupId}`
    });
    const result = core.createFromDatabase<ICollection<IModel>>([
      row(1, 10, 7),
      row(2, 20, 7),
      row(1, 10, 7), // scope revisit, same child: nothing new
      row(2, 21, 7), // scope revisit, new child sharing the lookup
      row(1, 11, 7)
    ]);

    expect(result.models.length).toEqual(2);
    expect(counts).toEqual({ root: 2, child: 4, lookup: 2 });
    expect((result.models[0] as any).countedChilds.models.length).toEqual(2);
    expect((result.models[1] as any).countedChilds.models.length).toEqual(2);
    const scope1Children = (result.models[0] as any).countedChilds.models;
    expect(scope1Children[0].countedLookup).toBe(
      scope1Children[1].countedLookup
    );
  });

  test("Shipment's derived dates materialize through the ORM", () => {
    // The captured pages happen to have no upcoming shipments, so exercise
    // the constructor with the columns a matching shipment row carries.
    const core = createCore({ entities });
    const retail = rows.productPageRetail();
    const shipped = {
      ...retail[0],
      'shipment_actual_product_variant#shipment_id': 501,
      'shipment#id': 501,
      'shipment#inventory_location_id': null,
      'shipment#sellable_date': '2026-09-01T12:00:00.000Z'
    };
    const variants = core.createFromDatabase<ICollection<IModel>>([shipped]);
    const shipment = (variants.models[0] as any).shipmentActualProductVariants
      .models[0].shipment;
    expect(shipment).toBeInstanceOf(Shipment);
    expect(shipment.sellableDateOnlyISO).toEqual('2026-09-01');
    expect(typeof shipment.sellableDateLocale).toEqual('string');
  });
});
