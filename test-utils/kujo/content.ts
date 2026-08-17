/* The kujo content domain: the small single-entity and two-entity queries a
 * product page issues alongside its big variant query. Mirrored from the
 * application's models/ directory as of 2026-08-16.
 */
import { Base, BaseCollection } from './base';
import { IColumns } from '../../src/index';
import { Product, Color } from './catalog';

export class Instagram extends Base {}
export class Instagrams extends BaseCollection {}
export const instagramEntity = {
  tableName: 'instagram',
  columns: [
    'id',
    'author',
    'icon_url',
    'image_url',
    'copy',
    'url',
    'created_date',
    'modified_date'
  ] as IColumns,
  Model: Instagram,
  Collection: Instagrams
};

export class ProductNote extends Base {}
export class ProductNotes extends BaseCollection {}
export const productNoteEntity = {
  tableName: 'product_note',
  columns: [
    'id',
    { column: 'product_id', references: Product },
    { column: 'color_id', references: Color },
    'note_text',
    'created_at',
    'updated_at'
  ] as IColumns,
  Model: ProductNote,
  Collection: ProductNotes
};

export class ProductFeature extends Base {}
export class ProductFeatures extends BaseCollection {}
export const productFeatureEntity = {
  tableName: 'product_feature',
  columns: [
    'id',
    { column: 'product_id', references: Product },
    'feature',
    'position',
    'created_date',
    'updated_date'
  ] as IColumns,
  Model: ProductFeature,
  Collection: ProductFeatures
};

export class ProductSpecification extends Base {}
export class ProductSpecifications extends BaseCollection {}
export const productSpecificationEntity = {
  tableName: 'product_specification',
  columns: [
    'id',
    { column: 'product_id', references: Product },
    'spec_key',
    'spec_value',
    'position',
    'created_date',
    'updated_date'
  ] as IColumns,
  Model: ProductSpecification,
  Collection: ProductSpecifications
};
