/* Positional (array-mode) ingestion: `createFromDatabaseArrays` must build
 * exactly the graph `createFromDatabase` builds from the same data, while
 * reading cells by position and, with `parseKinds`, type-parsing only the
 * cells it keeps. Cross-implementation coverage (compiled vs interpreted,
 * descriptor-level graph equality) lives in scripts/diff-core.js --arrays;
 * these tests pin the public behavior.
 */
import { createCore, ICollection, IModel } from './core';
import { entities as orderEntities } from '../test-utils/order/entities';
import { entities as blogEntities } from '../test-utils/blog/entities';
import { entities as orderMoreEntities } from '../test-utils/order-more/entities';
import { entities as sixEntities } from '../test-utils/six/entities';
import { entities as thirteenEntities } from '../test-utils/thirteen/entities';
import { entities as kujoEntities } from '../test-utils/kujo/entities';
const three = require('../test-utils/three/results');
const one = require('../test-utils/one/results.json');
const six = require('../test-utils/six/results.json');
const eleven = require('../test-utils/eleven/results.json');
const thirteen = require('../test-utils/thirteen/results.json');
const kujoRows = require('../test-utils/kujo/rows');

const toArrays = (
  rows: Array<any>
): { fields: Array<string>; cells: Array<Array<any>> } => {
  const fields = Object.keys(rows[0]);
  return {
    fields,
    cells: rows.map((row) => fields.map((field) => row[field]))
  };
};

const expectSameGraph = (entities: any, rows: Array<any>): void => {
  const core = createCore({ entities });
  const fromObjects = core.createFromDatabase<ICollection<IModel>>(rows);
  const { fields, cells } = toArrays(rows);
  const fromArrays = core.createFromDatabaseArrays<ICollection<IModel>>(
    cells,
    fields
  );
  expect(fromArrays).toBeInstanceOf(fromObjects.constructor);
  expect(fromArrays.models.length).toBe(fromObjects.models.length);
  for (let i = 0; i < fromObjects.models.length; i++) {
    expect(fromArrays.models[i]).toBeInstanceOf(
      fromObjects.models[i].constructor
    );
  }
  expect(JSON.stringify(fromArrays)).toBe(JSON.stringify(fromObjects));
};

describe('createFromDatabaseArrays', () => {
  test('builds the createFromDatabase graph across fixture families', () => {
    expectSameGraph(orderEntities, one);
    expectSameGraph(blogEntities, three);
    expectSameGraph(sixEntities, six);
    expectSameGraph(orderMoreEntities, eleven);
    expectSameGraph(thirteenEntities, thirteen);
    expectSameGraph(kujoEntities, kujoRows.parcelTracking());
  });

  test('handles repeated, interleaved and sparse rows like object mode', () => {
    const shifted = eleven.map((row: any) => {
      const out: any = {};
      for (const key in row) {
        out[key] =
          typeof row[key] === 'number' &&
          (key.endsWith('#id') || key.endsWith('_id'))
            ? row[key] + 1000000
            : row[key];
      }
      return out;
    });
    const interleaved: Array<any> = [];
    for (let i = 0; i < eleven.length; i++) {
      interleaved.push(eleven[i], shifted[i]);
    }
    expectSameGraph(orderMoreEntities, interleaved);

    const rootTable = 'order';
    const sparse = eleven.map((row: any) => {
      const out: any = {};
      for (const key in row) {
        out[key] = key.startsWith(`${rootTable}#`) ? row[key] : null;
      }
      return out;
    });
    expectSameGraph(orderMoreEntities, sparse);
  });

  test('accepts driver field descriptors carrying a name', () => {
    const core = createCore({ entities: sixEntities });
    const { fields, cells } = toArrays(six);
    const descriptors = fields.map((name) => ({ name, dataTypeID: 0 }));
    const fromDescriptors = core.createFromDatabaseArrays(cells, descriptors);
    const fromObjects = core.createFromDatabase(six);
    expect(JSON.stringify(fromDescriptors)).toBe(JSON.stringify(fromObjects));
  });

  test('an empty result set with a known shape yields an empty collection', () => {
    const core = createCore({ entities: orderMoreEntities });
    const { fields } = toArrays(eleven);
    const collection = core.createFromDatabaseArrays<ICollection<IModel>>(
      [],
      fields
    );
    expect(collection.models).toEqual([]);
    const nonEmpty = core.createFromDatabaseArrays<ICollection<IModel>>(
      toArrays(eleven).cells,
      fields
    );
    expect(collection).toBeInstanceOf(nonEmpty.constructor);
  });

  test('back-reference collections stay linked and JSON-safe', () => {
    const core = createCore({ entities: blogEntities });
    const { fields, cells } = toArrays(three);
    const articles = core.createFromDatabaseArrays<ICollection<IModel>>(
      cells,
      fields
    );
    const article = articles.models[0];
    expect(article.person.articles.models).toContain(article);
    expect(() => JSON.stringify(article)).not.toThrow();
    expect(JSON.parse(JSON.stringify(article)).person.articles).toBe(undefined);
  });

  describe('parseKinds', () => {
    class Reading {
      constructor(props: any) {
        Object.assign(this, props);
      }
    }
    class Readings {
      models: Array<IModel>;
      constructor({ models }: any) {
        this.models = models;
      }
    }
    const entities = [
      {
        tableName: 'reading',
        columns: ['id', 'taken_at', 'value', 'active', 'meta', 'label'],
        Model: Reading as any,
        Collection: Readings as any
      }
    ];
    const fields = [
      'reading#id',
      'reading#taken_at',
      'reading#value',
      'reading#active',
      'reading#meta',
      'reading#label'
    ];
    // 0 for the trailing label: a shorter kinds list leaves cells untouched.
    const kinds = [1, 2, 1, 3, 4] as any;

    test('parses numbers, timestamps, booleans and json; null passes through', () => {
      const core = createCore({ entities });
      const cells = [
        ['7', '2021-03-04T05:06:07.000Z', '12.5', 't', '{"a":[1,2]}', 'x'],
        ['8', null, '-3', 'f', null, null]
      ];
      const readings = core.createFromDatabaseArrays<ICollection<IModel>>(
        cells,
        fields,
        kinds
      );
      const [first, second] = readings.models as Array<any>;
      expect(first.id).toBe(7);
      expect(first.takenAt).toBeInstanceOf(Date);
      expect(first.takenAt.toISOString()).toBe('2021-03-04T05:06:07.000Z');
      expect(first.value).toBe(12.5);
      expect(first.active).toBe(true);
      expect(first.meta).toEqual({ a: [1, 2] });
      expect(first.label).toBe('x');
      expect(second.id).toBe(8);
      expect(second.takenAt).toBe(null);
      expect(second.value).toBe(-3);
      expect(second.active).toBe(false);
      expect(second.meta).toBe(null);
      expect(second.label).toBe(null);
    });

    test('a function entry runs as that field:s parser', () => {
      const core = createCore({ entities });
      const upper = (text: string): string => text.toUpperCase();
      const readings = core.createFromDatabaseArrays<ICollection<IModel>>(
        [['1', null, null, null, null, 'abc']],
        fields,
        [1, 0, 0, 0, 0, upper]
      );
      expect((readings.models[0] as any).label).toBe('ABC');
    });

    test('the same fields identity with different kinds compiles distinct plans', () => {
      const core = createCore({ entities });
      const cells = [['1', null, null, null, null, '5']];
      const asText = core.createFromDatabaseArrays<ICollection<IModel>>(
        cells,
        fields
      );
      const asNumber = core.createFromDatabaseArrays<ICollection<IModel>>(
        cells,
        fields,
        [1, 0, 0, 0, 0, 1]
      );
      expect((asText.models[0] as any).label).toBe('5');
      expect((asNumber.models[0] as any).label).toBe(5);
      // And the unparsed plan still answers correctly afterwards.
      const asTextAgain = core.createFromDatabaseArrays<ICollection<IModel>>(
        cells,
        fields
      );
      expect((asTextAgain.models[0] as any).label).toBe('5');
    });

    test('parsed key cells deduplicate and link across mixed pk/fk text', () => {
      const core = createCore({ entities: blogEntities });
      const { fields: blogFields, cells } = toArrays(three);
      const textCells = cells.map((row) =>
        row.map((cell) =>
          cell === null
            ? null
            : cell instanceof Date
            ? cell.toISOString()
            : String(cell)
        )
      );
      const blogKinds = blogFields.map((field) => {
        const sample = three
          .map((row: any) => row[field])
          .find((value: any) => value !== null && value !== undefined);
        return typeof sample === 'number' ? 1 : sample instanceof Date ? 2 : 0;
      });
      const parsed = core.createFromDatabaseArrays<ICollection<IModel>>(
        textCells,
        blogFields,
        blogKinds as any
      );
      const fromObjects = core.createFromDatabase<ICollection<IModel>>(three);
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(fromObjects));
    });
  });

  describe('input validation', () => {
    test('rejects an empty fields list', () => {
      const core = createCore({ entities: sixEntities });
      expect(() => core.createFromDatabaseArrays([], [])).toThrow(
        'non-empty fields list'
      );
    });

    test('rejects rows that are not an array', () => {
      const core = createCore({ entities: sixEntities });
      expect(() =>
        core.createFromDatabaseArrays({} as any, ['tag#id'])
      ).toThrow('array of arrays');
    });

    test('rejects fields that are not namespaced to a table', () => {
      const core = createCore({ entities: sixEntities });
      expect(() => core.createFromDatabaseArrays([[1]], ['id'])).toThrow(
        'namespaced'
      );
    });
  });
});
