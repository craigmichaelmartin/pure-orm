/* eslint-disable max-len */
import { create } from './index';
import { entities as orderEntities } from '../test-utils/order/entities';

test('getSqlInsertParts', () => {
  const orm = create({
    entities: orderEntities,
    db: { $config: { pgp: true } }
  });
  const order = new orderEntities[0].Model({
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

test('getSqlUpdateParts', () => {
  const orm = create({
    entities: orderEntities,
    db: { $config: { pgp: true } }
  });
  const order = new orderEntities[0].Model({
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

test('getMatchingParts', () => {
  const orm = create({
    entities: orderEntities,
    db: { $config: { pgp: true } }
  });
  const order = new orderEntities[0].Model({
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

test('getMatchingPartsObject', () => {
  const orm = create({
    entities: orderEntities,
    db: { $config: { pgp: true } }
  });
  const order = new orderEntities[0].Model({
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

test('getValueBySqlColumn', () => {
  const orm = create({
    entities: orderEntities,
    db: { $config: { pgp: true } }
  });
  const order = new orderEntities[0].Model({
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
