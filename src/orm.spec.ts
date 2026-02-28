/* eslint-disable max-len */
import { create } from './index';
import { entities as orderEntities } from '../test-utils/order/entities';
import { Order } from '../test-utils/order/models/order';
import { UtmSource } from '../test-utils/order/models/utm-source';

const mockPgpDb = (overrides: any = {}) => ({
  $config: { pgp: true },
  many: jest.fn(),
  any: jest.fn(),
  result: jest.fn(),
  none: jest.fn(),
  ...overrides
});

/* -------------------------------------------------------------------------*/
/* Helper Utility Functions ------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('getSqlInsertParts', () => {
  test('generates correct insert parts for a model with defined values', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({
      id: 1,
      email: 'test@test.com',
      subtotalPrice: 100,
      utmSourceId: 10
    });
    expect(orm.getSqlInsertParts(order)).toEqual({
      columns: '"id", "email", "subtotal_price", "utm_source_id"',
      values: [1, 'test@test.com', 100, 10],
      valuesVar: ['$1', '$2', '$3', '$4']
    });
  });

  test('filters out undefined properties', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 5 });
    const result = orm.getSqlInsertParts(order);
    expect(result.columns).toEqual('"id"');
    expect(result.values).toEqual([5]);
    expect(result.valuesVar).toEqual(['$1']);
  });

  test('includes all defined properties', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({
      id: 1,
      email: 'a@b.com',
      browserIp: '1.2.3.4',
      subtotalPrice: 50,
      totalPrice: 55
    });
    const result = orm.getSqlInsertParts(order);
    expect(result.values).toContain(1);
    expect(result.values).toContain('a@b.com');
    expect(result.values).toContain(50);
    expect(result.values).toContain(55);
    expect(result.values.length).toEqual(result.valuesVar.length);
  });
});

describe('getSqlUpdateParts', () => {
  test('generates correct update parts', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({
      id: 1,
      email: 'test@test.com',
      subtotalPrice: 100,
      utmSourceId: 10
    });
    expect(orm.getSqlUpdateParts(order)).toEqual({
      clause:
        '"id" = $1, "email" = $2, "subtotal_price" = $3, "utm_source_id" = $4',
      idVar: '$5',
      values: [1, 'test@test.com', 100, 10, 1]
    });
  });

  test('appends the id value at the end of values array', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 42, email: 'x@y.com' });
    const result = orm.getSqlUpdateParts(order);
    expect(result.values[result.values.length - 1]).toEqual(42);
  });

  test('custom "on" parameter uses that property for the id value', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1, email: 'x@y.com' });
    const result = orm.getSqlUpdateParts(order, 'email');
    expect(result.values[result.values.length - 1]).toEqual('x@y.com');
  });

  test('filters out undefined properties from clause', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 7 });
    const result = orm.getSqlUpdateParts(order);
    expect(result.clause).toEqual('"id" = $1');
    expect(result.idVar).toEqual('$2');
    expect(result.values).toEqual([7, 7]);
  });
});

describe('getMatchingParts', () => {
  test('generates correct WHERE clause and values', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({
      id: 1,
      email: 'test@test.com',
      subtotalPrice: 100,
      utmSourceId: 10
    });
    expect(orm.getMatchingParts(order)).toEqual({
      values: [1, 'test@test.com', 100, 10],
      whereClause:
        '"order"."id" = $1 AND "order"."email" = $2 AND "order"."subtotal_price" = $3 AND "order"."utm_source_id" = $4'
    });
  });

  test('filters out null and undefined values', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    const result = orm.getMatchingParts(order);
    expect(result.whereClause).toEqual('"order"."id" = $1');
    expect(result.values).toEqual([1]);
  });
});

describe('getMatchingPartsObject', () => {
  test('generates correct WHERE clause and object values', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({
      id: 1,
      email: 'test@test.com',
      subtotalPrice: 100,
      utmSourceId: 10
    });
    expect(orm.getMatchingPartsObject(order)).toEqual({
      values: {
        1: 1,
        2: 'test@test.com',
        3: 100,
        4: 10
      },
      whereClause:
        '"order"."id" = $(1) AND "order"."email" = $(2) AND "order"."subtotal_price" = $(3) AND "order"."utm_source_id" = $(4)'
    });
  });

  test('uses $() syntax for parameterized values', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 5 });
    const result = orm.getMatchingPartsObject(order);
    expect(result.whereClause).toContain('$(1)');
    expect(result.values).toEqual({ 1: 5 });
  });
});

describe('getValueBySqlColumn', () => {
  test('retrieves values by SQL column name', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({
      id: 1,
      email: 'test@test.com',
      subtotalPrice: 100,
      utmSourceId: 10
    });
    expect(orm.getValueBySqlColumn(order, 'id')).toEqual(1);
    expect(orm.getValueBySqlColumn(order, 'email')).toEqual('test@test.com');
    expect(orm.getValueBySqlColumn(order, 'subtotal_price')).toEqual(100);
    expect(orm.getValueBySqlColumn(order, 'utm_source_id')).toEqual(10);
  });

  test('returns undefined for columns with no value set', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    expect(orm.getValueBySqlColumn(order, 'email')).toBeUndefined();
  });
});

describe('getSqlColumnForPropertyName', () => {
  test('maps property names to SQL column names', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    expect(orm.getSqlColumnForPropertyName(order, 'id')).toEqual('id');
    expect(orm.getSqlColumnForPropertyName(order, 'utmSourceId')).toEqual(
      'utm_source_id'
    );
    expect(orm.getSqlColumnForPropertyName(order, 'browserIP')).toEqual(
      'browser_ip'
    );
  });

  test('returns undefined for non-existent property name', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    expect(
      orm.getSqlColumnForPropertyName(order, 'nonExistent')
    ).toBeUndefined();
  });
});

describe('getNewWith', () => {
  test('creates a new model instance with specified SQL columns and values', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    const newOrder = orm.getNewWith(order, ['id', 'email'], [99, 'new@test.com']);
    expect(newOrder).toBeInstanceOf(Order);
    expect(newOrder.id).toEqual(99);
    expect(newOrder.email).toEqual('new@test.com');
  });

  test('creates model with single column', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    const newOrder = orm.getNewWith(order, ['id'], [42]);
    expect(newOrder).toBeInstanceOf(Order);
    expect(newOrder.id).toEqual(42);
  });

  test('maps SQL column names to property names', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    const order = new Order({ id: 1 });
    const newOrder = orm.getNewWith(
      order,
      ['id', 'subtotal_price', 'utm_source_id'],
      [1, 200, 5]
    );
    expect(newOrder.id).toEqual(1);
    expect(newOrder.subtotalPrice).toEqual(200);
    expect(newOrder.utmSourceId).toEqual(5);
  });
});

/* -------------------------------------------------------------------------*/
/* Unsupported driver error ------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('unsupported database driver', () => {
  test('throws for an unrecognized driver', () => {
    expect(() =>
      create({
        entities: orderEntities,
        db: { $config: {} }
      })
    ).toThrow('database driver is not yet supported');
  });
});

/* -------------------------------------------------------------------------*/
/* CRUD operations (mocked db) ---------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('CRUD operations', () => {
  const orderSelectClause =
    '"order".id as "order#id", "order".email as "order#email", "order".browser_ip as "order#browser_ip", "order".browser_user_agent as "order#browser_user_agent", "order".kujo_imported_date as "order#kujo_imported_date", "order".created_date as "order#created_date", "order".cancel_reason as "order#cancel_reason", "order".cancelled_date as "order#cancelled_date", "order".closed_date as "order#closed_date", "order".processed_date as "order#processed_date", "order".updated_date as "order#updated_date", "order".note as "order#note", "order".subtotal_price as "order#subtotal_price", "order".taxes_included as "order#taxes_included", "order".total_discounts as "order#total_discounts", "order".total_price as "order#total_price", "order".total_tax as "order#total_tax", "order".total_weight as "order#total_weight", "order".order_status_url as "order#order_status_url", "order".utm_source_id as "order#utm_source_id", "order".utm_medium_id as "order#utm_medium_id", "order".utm_campaign as "order#utm_campaign", "order".utm_content as "order#utm_content", "order".utm_term as "order#utm_term"';

  const makeRow = (id: number, email: string | null) => ({
    'order#id': id,
    'order#email': email,
    'order#browser_ip': null,
    'order#browser_user_agent': null,
    'order#kujo_imported_date': null,
    'order#created_date': null,
    'order#cancel_reason': null,
    'order#cancelled_date': null,
    'order#closed_date': null,
    'order#processed_date': null,
    'order#updated_date': null,
    'order#note': null,
    'order#subtotal_price': null,
    'order#taxes_included': null,
    'order#total_discounts': null,
    'order#total_price': null,
    'order#total_tax': null,
    'order#total_weight': null,
    'order#order_status_url': null,
    'order#utm_source_id': null,
    'order#utm_medium_id': null,
    'order#utm_campaign': null,
    'order#utm_content': null,
    'order#utm_term': null
  });

  describe('create (INSERT)', () => {
    test('builds INSERT query and returns created model', async () => {
      const db = mockPgpDb({
        many: jest.fn().mockResolvedValue([makeRow(1, 'new@test.com')])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1, email: 'new@test.com' });
      const result = await orm.create(order);
      expect(db.many).toHaveBeenCalledTimes(1);
      const [query, values] = db.many.mock.calls[0];
      expect(query).toContain('INSERT INTO "order"');
      expect(query).toContain('"id", "email"');
      expect(query).toContain('$1,$2');
      expect(query).toContain('RETURNING');
      expect(values).toEqual([1, 'new@test.com']);
      expect(result.id).toEqual(1);
      expect(result.email).toEqual('new@test.com');
    });

    test('only includes defined columns in INSERT', async () => {
      const db = mockPgpDb({
        many: jest.fn().mockResolvedValue([makeRow(5, null)])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 5 });
      await orm.create(order);
      const [query, values] = db.many.mock.calls[0];
      expect(query).toContain('"id"');
      expect(query).not.toContain('"email"');
      expect(values).toEqual([5]);
    });
  });

  describe('update (UPDATE)', () => {
    test('builds UPDATE query and returns updated model', async () => {
      const db = mockPgpDb({
        many: jest.fn().mockResolvedValue([makeRow(1, 'updated@test.com')])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1, email: 'updated@test.com' });
      const result = await orm.update(order);
      expect(db.many).toHaveBeenCalledTimes(1);
      const [query, values] = db.many.mock.calls[0];
      expect(query).toContain('UPDATE "order"');
      expect(query).toContain('SET');
      expect(query).toContain('WHERE');
      expect(query).toContain('RETURNING');
      expect(values).toContain(1);
      expect(values).toContain('updated@test.com');
      expect(result.email).toEqual('updated@test.com');
    });

    test('uses custom "on" column for WHERE clause', async () => {
      const db = mockPgpDb({
        many: jest.fn().mockResolvedValue([makeRow(1, 'x@y.com')])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1, email: 'x@y.com' });
      await orm.update(order, { on: 'email' });
      const [query, values] = db.many.mock.calls[0];
      expect(query).toContain('WHERE');
      expect(query).toContain('"order".email');
      expect(values[values.length - 1]).toEqual('x@y.com');
    });
  });

  describe('delete (DELETE)', () => {
    test('builds DELETE query with id', async () => {
      const db = mockPgpDb({
        none: jest.fn().mockResolvedValue(null)
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 42 });
      await orm.delete(order);
      expect(db.none).toHaveBeenCalledTimes(1);
      const [query, values] = db.none.mock.calls[0];
      expect(query).toContain('DELETE FROM "order"');
      expect(query).toContain('"order".id = $(id)');
      expect(values).toEqual({ id: 42 });
    });
  });

  describe('deleteMatching', () => {
    test('builds DELETE query with WHERE clause from model properties', async () => {
      const db = mockPgpDb({
        none: jest.fn().mockResolvedValue(null)
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 10, email: 'del@test.com' });
      await orm.deleteMatching(order);
      expect(db.none).toHaveBeenCalledTimes(1);
      const [query, values] = db.none.mock.calls[0];
      expect(query).toContain('DELETE FROM "order"');
      expect(query).toContain('WHERE');
      expect(query).toContain('"order"."id" = $1');
      expect(query).toContain('"order"."email" = $2');
      expect(values).toEqual([10, 'del@test.com']);
    });
  });

  describe('getMatching', () => {
    test('builds SELECT query with WHERE clause and returns one model', async () => {
      const db = mockPgpDb({
        many: jest.fn().mockResolvedValue([makeRow(1, 'found@test.com')])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1 });
      const result = await orm.getMatching(order);
      expect(db.many).toHaveBeenCalledTimes(1);
      const [query, values] = db.many.mock.calls[0];
      expect(query).toContain('SELECT');
      expect(query).toContain('FROM "order"');
      expect(query).toContain('WHERE');
      expect(query).toContain('"order"."id" = $1');
      expect(values).toEqual([1]);
      expect(result.id).toEqual(1);
      expect(result.email).toEqual('found@test.com');
    });
  });

  describe('getOneOrNoneMatching', () => {
    test('returns a model when one exists', async () => {
      const db = mockPgpDb({
        any: jest.fn().mockResolvedValue([makeRow(1, 'one@test.com')])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1 });
      const result = await orm.getOneOrNoneMatching(order);
      expect(db.any).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result!.id).toEqual(1);
    });

    test('returns undefined when none exist', async () => {
      const db = mockPgpDb({
        any: jest.fn().mockResolvedValue([])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 999 });
      const result = await orm.getOneOrNoneMatching(order);
      expect(result).toBeUndefined();
    });
  });

  describe('getAnyMatching', () => {
    test('returns collection when results exist', async () => {
      const db = mockPgpDb({
        result: jest.fn().mockResolvedValue({
          rows: [makeRow(1, 'a@test.com'), makeRow(2, 'b@test.com')],
          fields: [{ name: 'order#id' }]
        })
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1 });
      const result: any = await orm.getAnyMatching(order);
      expect(db.result).toHaveBeenCalledTimes(1);
      expect(result.models.length).toEqual(2);
    });

    test('returns empty collection when no results', async () => {
      const db = mockPgpDb({
        result: jest.fn().mockResolvedValue({
          rows: [],
          fields: [{ name: 'order#id' }]
        })
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 999 });
      const result: any = await orm.getAnyMatching(order);
      expect(result.models.length).toEqual(0);
    });
  });

  describe('getAllMatching', () => {
    test('returns collection when results exist', async () => {
      const db = mockPgpDb({
        any: jest.fn().mockResolvedValue([makeRow(1, 'a@test.com')])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 1 });
      const result: any = await orm.getAllMatching(order);
      expect(db.any).toHaveBeenCalledTimes(1);
      expect(result.models.length).toEqual(1);
    });

    test('throws when no results exist', async () => {
      const db = mockPgpDb({
        any: jest.fn().mockResolvedValue([])
      });
      const orm = create({ entities: orderEntities, db });
      const order = new Order({ id: 999 });
      await expect(orm.getAllMatching(order)).rejects.toThrow();
    });
  });
});

/* -------------------------------------------------------------------------*/
/* ORM exposes core methods ------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('ORM exposes core methods', () => {
  test('exposes createFromDatabase', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.createFromDatabase).toBe('function');
  });

  test('exposes createOneFromDatabase', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.createOneFromDatabase).toBe('function');
  });

  test('exposes createOneOrNoneFromDatabase', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.createOneOrNoneFromDatabase).toBe('function');
  });

  test('exposes createManyFromDatabase', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.createManyFromDatabase).toBe('function');
  });

  test('exposes createAnyFromDatabase', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.createAnyFromDatabase).toBe('function');
  });

  test('exposes tables', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(orm.tables).toBeDefined();
    expect(Object.keys(orm.tables).length).toEqual(5);
  });

  test('exposes getEntityByModel', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.getEntityByModel).toBe('function');
    const order = new Order({ id: 1 });
    expect(orm.getEntityByModel(order).tableName).toEqual('order');
  });

  test('exposes getEntityByTableName', () => {
    const orm = create({
      entities: orderEntities,
      db: mockPgpDb()
    });
    expect(typeof orm.getEntityByTableName).toBe('function');
    expect(orm.getEntityByTableName('order').tableName).toEqual('order');
  });

  test('exposes db reference', () => {
    const db = mockPgpDb();
    const orm = create({ entities: orderEntities, db });
    expect(orm.db).toBe(db);
  });
});
