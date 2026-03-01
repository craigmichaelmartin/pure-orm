/* eslint-disable max-len */
import { createForPGP } from './pgp';
import { createCore, IModel, ICollection } from '../core';
import { entities as orderEntities } from '../../test-utils/order/entities';

class SimpleModel implements IModel {
  id: number;
  constructor(props: any) {
    this.id = props.id;
  }
}
class SimpleCollection implements ICollection<SimpleModel> {
  models: Array<SimpleModel>;
  constructor({ models }: any) {
    this.models = models;
  }
}

const simpleEntities = [
  {
    tableName: 'widget',
    columns: ['id'] as any,
    Model: SimpleModel,
    Collection: SimpleCollection
  }
];

const makeRow = (id: number) => ({
  'widget#id': id
});

const makeOrderRow = (id: number, email: string) => ({
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

/* -------------------------------------------------------------------------*/
/* one ---------------------------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('one', () => {
  test('calls db.many and returns a single model', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { many: jest.fn().mockResolvedValue([makeRow(1)]) };
    const pgp = createForPGP({ core, db });

    const result = await pgp.one('SELECT ...', { id: 1 });
    expect(db.many).toHaveBeenCalledWith('SELECT ...', { id: 1 });
    expect(result.id).toEqual(1);
  });

  test('throws when db.many returns empty array', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { many: jest.fn().mockResolvedValue([]) };
    const pgp = createForPGP({ core, db });

    await expect(pgp.one('SELECT ...')).rejects.toThrow();
  });

  test('throws when result nests into more than one model', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      many: jest.fn().mockResolvedValue([makeRow(1), makeRow(2)])
    };
    const pgp = createForPGP({ core, db });

    await expect(pgp.one('SELECT ...')).rejects.toThrow();
  });

  test('passes values to db.many', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { many: jest.fn().mockResolvedValue([makeRow(5)]) };
    const pgp = createForPGP({ core, db });

    await pgp.one('SELECT ... WHERE id = $1', [5]);
    expect(db.many).toHaveBeenCalledWith('SELECT ... WHERE id = $1', [5]);
  });
});

/* -------------------------------------------------------------------------*/
/* oneOrNone ---------------------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('oneOrNone', () => {
  test('returns a model when one result exists', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { any: jest.fn().mockResolvedValue([makeRow(1)]) };
    const pgp = createForPGP({ core, db });

    const result = await pgp.oneOrNone('SELECT ...', { id: 1 });
    expect(db.any).toHaveBeenCalledWith('SELECT ...', { id: 1 });
    expect(result!.id).toEqual(1);
  });

  test('returns undefined when no results', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { any: jest.fn().mockResolvedValue([]) };
    const pgp = createForPGP({ core, db });

    const result = await pgp.oneOrNone('SELECT ...');
    expect(result).toBeUndefined();
  });

  test('throws when more than one result', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      any: jest.fn().mockResolvedValue([makeRow(1), makeRow(2)])
    };
    const pgp = createForPGP({ core, db });

    await expect(pgp.oneOrNone('SELECT ...')).rejects.toThrow();
  });
});

/* -------------------------------------------------------------------------*/
/* many --------------------------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('many', () => {
  test('returns a collection with at least one model', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      any: jest.fn().mockResolvedValue([makeRow(1), makeRow(2)])
    };
    const pgp = createForPGP({ core, db });

    const result: any = await pgp.many('SELECT ...');
    expect(db.any).toHaveBeenCalledWith('SELECT ...', undefined);
    expect(result.models.length).toEqual(2);
    expect(result.models[0].id).toEqual(1);
    expect(result.models[1].id).toEqual(2);
  });

  test('works with a single result row', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { any: jest.fn().mockResolvedValue([makeRow(42)]) };
    const pgp = createForPGP({ core, db });

    const result: any = await pgp.many('SELECT ...');
    expect(result.models.length).toEqual(1);
    expect(result.models[0].id).toEqual(42);
  });

  test('throws when no results', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { any: jest.fn().mockResolvedValue([]) };
    const pgp = createForPGP({ core, db });

    await expect(pgp.many('SELECT ...')).rejects.toThrow();
  });

  test('passes values to db.any', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { any: jest.fn().mockResolvedValue([makeRow(1)]) };
    const pgp = createForPGP({ core, db });

    await pgp.many('SELECT ... WHERE x = $1', [10]);
    expect(db.any).toHaveBeenCalledWith('SELECT ... WHERE x = $1', [10]);
  });
});

/* -------------------------------------------------------------------------*/
/* any ---------------------------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('any', () => {
  test('returns a collection when results exist', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      result: jest.fn().mockResolvedValue({
        rows: [makeRow(1), makeRow(2)],
        fields: [{ name: 'widget#id' }]
      })
    };
    const pgp = createForPGP({ core, db });

    const result: any = await pgp.any('SELECT ...');
    expect(db.result).toHaveBeenCalledWith('SELECT ...', undefined);
    expect(result.models.length).toEqual(2);
  });

  test('returns empty collection when no results', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      result: jest.fn().mockResolvedValue({
        rows: [],
        fields: [{ name: 'widget#id' }]
      })
    };
    const pgp = createForPGP({ core, db });

    const result: any = await pgp.any('SELECT ...');
    expect(result.models).toBeDefined();
    expect(result.models.length).toEqual(0);
  });

  test('extracts table name from first field name', async () => {
    const core = createCore({ entities: orderEntities });
    const db = {
      result: jest.fn().mockResolvedValue({
        rows: [makeOrderRow(1, 'a@b.com')],
        fields: [{ name: 'order#id' }]
      })
    };
    const pgp = createForPGP({ core, db });

    const result: any = await pgp.any('SELECT ...');
    expect(result.models.length).toEqual(1);
    expect(result.models[0].id).toEqual(1);
  });

  test('passes values to db.result', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      result: jest.fn().mockResolvedValue({
        rows: [],
        fields: [{ name: 'widget#id' }]
      })
    };
    const pgp = createForPGP({ core, db });

    await pgp.any('SELECT ... WHERE x = $1', [5]);
    expect(db.result).toHaveBeenCalledWith('SELECT ... WHERE x = $1', [5]);
  });
});

/* -------------------------------------------------------------------------*/
/* none --------------------------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('none', () => {
  test('calls db.none and resolves to null', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { none: jest.fn().mockResolvedValue(undefined) };
    const pgp = createForPGP({ core, db });

    const result = await pgp.none('DELETE ...');
    expect(db.none).toHaveBeenCalledWith('DELETE ...', undefined);
    expect(result).toBeNull();
  });

  test('passes values to db.none', async () => {
    const core = createCore({ entities: simpleEntities });
    const db = { none: jest.fn().mockResolvedValue(undefined) };
    const pgp = createForPGP({ core, db });

    await pgp.none('DELETE ... WHERE id = $(id)', { id: 7 });
    expect(db.none).toHaveBeenCalledWith('DELETE ... WHERE id = $(id)', {
      id: 7
    });
  });
});

/* -------------------------------------------------------------------------*/
/* Error handling ----------------------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('error handling', () => {
  test('defaultErrorHandler rethrows the error', async () => {
    const core = createCore({ entities: simpleEntities });
    const err = new Error('db error');
    const db = { many: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db });

    await expect(pgp.one('SELECT ...')).rejects.toThrow('db error');
  });

  test('defaultErrorHandler calls logError for non-QueryResultError', async () => {
    const logError = jest.fn((err: Error) => {
      throw err;
    }) as any;
    const core = createCore({ entities: simpleEntities });
    const err = new Error('unexpected error');
    const db = { many: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db, logError });

    await expect(pgp.one('SELECT ...')).rejects.toThrow('unexpected error');
    expect(logError).toHaveBeenCalledWith(err);
  });

  test('defaultErrorHandler does not call logError for QueryResultError', async () => {
    const logError = jest.fn((err: Error) => {
      throw err;
    }) as any;
    const core = createCore({ entities: simpleEntities });
    const err = new Error('no data');
    err.name = 'QueryResultError';
    const db = { many: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db, logError });

    await expect(pgp.one('SELECT ...')).rejects.toThrow('no data');
    expect(logError).not.toHaveBeenCalled();
  });

  test('custom errorHandler overrides defaultErrorHandler', async () => {
    const core = createCore({ entities: simpleEntities });
    const err = new Error('db failure');
    const db = { many: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db });
    const customHandler = jest.fn((_err: Error) => {
      throw new Error('custom handled');
    }) as any;

    await expect(
      pgp.one('SELECT ...', undefined, customHandler)
    ).rejects.toThrow('custom handled');
    expect(customHandler).toHaveBeenCalledWith(err);
  });

  test('custom errorHandler works for oneOrNone', async () => {
    const core = createCore({ entities: simpleEntities });
    const err = new Error('fail');
    const db = { any: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db });
    const customHandler = jest.fn((_err: Error) => {
      throw new Error('caught');
    }) as any;

    await expect(
      pgp.oneOrNone('SELECT ...', undefined, customHandler)
    ).rejects.toThrow('caught');
    expect(customHandler).toHaveBeenCalledWith(err);
  });

  test('custom errorHandler works for many', async () => {
    const core = createCore({ entities: simpleEntities });
    const err = new Error('fail');
    const db = { any: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db });
    const customHandler = jest.fn((_err: Error) => {
      throw new Error('caught');
    }) as any;

    await expect(
      pgp.many('SELECT ...', undefined, customHandler)
    ).rejects.toThrow('caught');
  });

  test('custom errorHandler works for any', async () => {
    const core = createCore({ entities: simpleEntities });
    const err = new Error('fail');
    const db = { result: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db });
    const customHandler = jest.fn((_err: Error) => {
      throw new Error('caught');
    }) as any;

    await expect(
      pgp.any('SELECT ...', undefined, customHandler)
    ).rejects.toThrow('caught');
  });

  test('custom errorHandler works for none', async () => {
    const core = createCore({ entities: simpleEntities });
    const err = new Error('fail');
    const db = { none: jest.fn().mockRejectedValue(err) };
    const pgp = createForPGP({ core, db });
    const customHandler = jest.fn((_err: Error) => {
      throw new Error('caught');
    }) as any;

    await expect(
      pgp.none('DELETE ...', undefined, customHandler)
    ).rejects.toThrow('caught');
  });
});

/* -------------------------------------------------------------------------*/
/* Returned object structure -----------------------------------------------*/
/* -------------------------------------------------------------------------*/

describe('createForPGP return structure', () => {
  test('includes all core methods', () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      many: jest.fn(),
      any: jest.fn(),
      result: jest.fn(),
      none: jest.fn()
    };
    const pgp = createForPGP({ core, db });

    expect(typeof pgp.createFromDatabase).toBe('function');
    expect(typeof pgp.createOneFromDatabase).toBe('function');
    expect(typeof pgp.createOneOrNoneFromDatabase).toBe('function');
    expect(typeof pgp.createManyFromDatabase).toBe('function');
    expect(typeof pgp.createAnyFromDatabase).toBe('function');
    expect(typeof pgp.getEntityByModel).toBe('function');
    expect(typeof pgp.getEntityByTableName).toBe('function');
    expect(pgp.tables).toBeDefined();
  });

  test('includes all query methods', () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      many: jest.fn(),
      any: jest.fn(),
      result: jest.fn(),
      none: jest.fn()
    };
    const pgp = createForPGP({ core, db });

    expect(typeof pgp.one).toBe('function');
    expect(typeof pgp.oneOrNone).toBe('function');
    expect(typeof pgp.many).toBe('function');
    expect(typeof pgp.any).toBe('function');
    expect(typeof pgp.none).toBe('function');
  });

  test('exposes db reference', () => {
    const core = createCore({ entities: simpleEntities });
    const db = {
      many: jest.fn(),
      any: jest.fn(),
      result: jest.fn(),
      none: jest.fn()
    };
    const pgp = createForPGP({ core, db });

    expect(pgp.db).toBe(db);
  });
});
