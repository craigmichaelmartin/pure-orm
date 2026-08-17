/* SQL-helper behavior on kujo-width entities. kujo's `order` is 46 columns
 * and `person` is 33 - both past MASK_COLUMN_LIMIT (30) - so unlike every
 * table in orm.spec.ts they take the wide-table path: a packed string shape
 * key and the generic column scan. That path was previously untested.
 */
import { create } from './index';
import { entities } from '../test-utils/kujo/entities';
import { Order, Person } from '../test-utils/kujo/orders';

const mockPgpDb = (overrides: any = {}) => ({
  $config: { pgp: true },
  many: jest.fn(),
  any: jest.fn(),
  result: jest.fn(),
  none: jest.fn(),
  ...overrides
});

const makeOrm = (db: any = mockPgpDb()) => create({ entities, db });

describe('wide-table (46-column) SQL helpers', () => {
  test('getSqlInsertParts spans the whole column list', () => {
    const orm = makeOrm();
    const order = new Order({
      id: 1,
      email: 'wide@example.com',
      totalPrice: '99.95',
      shippingSelection: 'standard',
      cancelled: false
    });
    const parts = orm.getSqlInsertParts(order);
    expect(parts.columns).toEqual(
      '"id", "email", "total_price", "shipping_selection", "cancelled"'
    );
    expect(parts.values).toEqual([
      1,
      'wide@example.com',
      '99.95',
      'standard',
      false
    ]);
    expect(parts.valuesVar).toEqual(['$1', '$2', '$3', '$4', '$5']);
  });

  test('an explicit null is written by INSERT but never matched on', () => {
    const orm = makeOrm();
    const order = new Order({ id: 2, note: null, email: 'x@example.com' });
    const insert = orm.getSqlInsertParts(order);
    expect(insert.columns).toEqual('"id", "email", "note"');
    expect(insert.values).toEqual([2, 'x@example.com', null]);
    const matching = orm.getMatchingParts(order);
    expect(matching.whereClause).toEqual(
      '"order"."id" = $1 AND "order"."email" = $2'
    );
    expect(matching.values).toEqual([2, 'x@example.com']);
  });

  test('every distinct shape gets its own cached clause', () => {
    const orm = makeOrm();
    const shapeA = new Order({ id: 1, email: 'a@example.com' });
    const shapeB = new Order({ id: 1, totalPrice: '10' });
    const shapeA2 = new Order({ id: 9, email: 'z@example.com' });
    expect(orm.getSqlInsertParts(shapeA).columns).toEqual('"id", "email"');
    expect(orm.getSqlInsertParts(shapeB).columns).toEqual(
      '"id", "total_price"'
    );
    // Same shape again: cached clause, fresh values.
    const again = orm.getSqlInsertParts(shapeA2);
    expect(again.columns).toEqual('"id", "email"');
    expect(again.values).toEqual([9, 'z@example.com']);
  });

  test('a property past bit 30 makes it into every helper', () => {
    // `cancelled` is column 46 of the order entity; a mask-based shape key
    // would lose it (1 << 45 wraps in 32-bit int space).
    const orm = makeOrm();
    const order = new Order({ id: 3, cancelled: true });
    expect(orm.getSqlInsertParts(order).columns).toEqual('"id", "cancelled"');
    expect(orm.getSqlUpdateParts(order).clause).toEqual(
      '"id" = $1, "cancelled" = $2'
    );
    expect(orm.getMatchingParts(order).whereClause).toEqual(
      '"order"."id" = $1 AND "order"."cancelled" = $2'
    );
    const object = orm.getMatchingPartsObject(order);
    expect(object.whereClause).toEqual(
      '"order"."id" = $(1) AND "order"."cancelled" = $(2)'
    );
    expect(object.values).toEqual({ 1: 3, 2: true });
  });

  test('getSqlUpdateParts with a custom "on" column', () => {
    const orm = makeOrm();
    const order = new Order({
      shopifyId: 'shop-1',
      totalPrice: '50',
      cancelled: false
    });
    const parts = orm.getSqlUpdateParts(order, 'shopifyId');
    expect(parts.clause).toEqual(
      '"shopify_id" = $1, "total_price" = $2, "cancelled" = $3'
    );
    expect(parts.idVar).toEqual('$4');
    expect(parts.values).toEqual(['shop-1', '50', false, 'shop-1']);
  });

  test('a 33-column model (person) takes the wide path too', () => {
    const orm = makeOrm();
    const person = new Person({ id: 4, email: 'p@example.com', admin: true });
    expect(orm.getMatchingParts(person).whereClause).toEqual(
      '"person"."id" = $1 AND "person"."email" = $2 AND "person"."admin" = $3'
    );
  });

  test('orm.create builds the full 46-column RETURNING clause', async () => {
    const orderEntity: any = entities.find(
      (entity: any) => entity.tableName === 'order'
    );
    expect(orderEntity).toBeDefined();
    const row: any = {};
    const columnList = orderEntity.columns as Array<any>;
    for (const column of columnList) {
      const name = typeof column === 'string' ? column : column.column;
      row[`order#${name}`] = null;
    }
    row['order#id'] = 7;
    row['order#email'] = 'created@example.com';
    const db = mockPgpDb({ many: jest.fn().mockResolvedValue([row]) });
    const orm = makeOrm(db);
    const created = await orm.create(
      new Order({ id: 7, email: 'created@example.com' })
    );
    const [query, values] = db.many.mock.calls[0];
    expect(query).toContain('INSERT INTO "order"');
    expect(query).toContain('"order".cancelled as "order#cancelled"');
    expect(query).toContain('"order".shipping_first_name');
    expect(values).toEqual([7, 'created@example.com']);
    expect(created.id).toEqual(7);
    expect(created.email).toEqual('created@example.com');
  });
});

describe('mask-boundary shape keys', () => {
  /* 30 columns is the last mask-keyed width, 31 the first string-keyed one.
   * Both must produce identical clause behavior, especially for the final
   * column, so a future change to the limit can't silently drop a bit.
   */
  const widthEntities = (width: number) => {
    class Wide {
      [key: string]: any;
      constructor(props: any) {
        Object.assign(this, props);
      }
    }
    class Wides {
      models: Array<any>;
      constructor({ models }: any) {
        this.models = models;
      }
    }
    const columns = Array.from({ length: width }, (_, i) =>
      i === 0 ? 'id' : `col_${i}`
    );
    return {
      Wide,
      entities: [
        { tableName: `wide_${width}`, columns, Model: Wide, Collection: Wides }
      ]
    };
  };

  test.each([[30], [31]])('width %i keeps its last column', (width) => {
    const { Wide, entities: wideEntities } = widthEntities(width);
    const orm = create({ entities: wideEntities as any, db: mockPgpDb() });
    const model = new Wide({ id: 1, [`col${width - 1}`]: 'tail' });
    const parts = orm.getSqlInsertParts(model);
    expect(parts.columns).toEqual(`"id", "col_${width - 1}"`);
    expect(parts.values).toEqual([1, 'tail']);
    expect(orm.getMatchingParts(model).whereClause).toEqual(
      `"wide_${width}"."id" = $1 AND "wide_${width}"."col_${width - 1}" = $2`
    );
  });
});
