/* The kujo catalog domain: every entity a product page render touches.
 * Table names, column lists, references and constructor behavior mirror the
 * kujo application's models/ directory as of 2026-08-16.
 */
import { Base, BaseCollection } from './base';
import { IColumns } from '../../src/index';

export class Vendor extends Base {}
export class Vendors extends BaseCollection {}
export const vendorEntity = {
  tableName: 'vendor',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: Vendor,
  Collection: Vendors
};

export class Fit extends Base {}
export class Fits extends BaseCollection {}
export const fitEntity = {
  tableName: 'fit',
  columns: ['id', 'label', 'value'] as IColumns,
  Model: Fit,
  Collection: Fits
};

export class Product extends Base {}
export class Products extends BaseCollection {}
export const productEntity = {
  tableName: 'product',
  columns: [
    'id',
    { column: 'vendor_id', references: Vendor },
    'shopify_id',
    'value',
    'label',
    'slug',
    'description',
    'google_product_category',
    'fb_product_category',
    'product_type',
    'created_date',
    'updated_date',
    'published_date',
    'category',
    { column: 'default_fit_id', references: Fit },
    'uses_colisted_gender_shoe_sizes'
  ] as IColumns,
  Model: Product,
  Collection: Products
};

export class ActualProductVariant extends Base {}
export class ActualProductVariants extends BaseCollection {}
export const actualProductVariantEntity = {
  tableName: 'actual_product_variant',
  columns: [
    'id',
    'sku',
    'upc',
    'requires_shipping',
    'tracked',
    'discontinued',
    'promo_eligible',
    'is_eligible_for_return_and_exchange'
  ] as IColumns,
  Model: ActualProductVariant,
  Collection: ActualProductVariants
};

export class Size extends Base {}
export class Sizes extends BaseCollection {}
export const sizeEntity = {
  tableName: 'size',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: Size,
  Collection: Sizes
};

export class Color extends Base {}
export class Colors extends BaseCollection {}
export const colorEntity = {
  tableName: 'color',
  columns: ['id', 'value', 'label', 'position', 'image_url'] as IColumns,
  Model: Color,
  Collection: Colors
};

export class Gender extends Base {}
export class Genders extends BaseCollection {}
export const genderEntity = {
  tableName: 'gender',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: Gender,
  Collection: Genders
};

export class ProductVariant extends Base {}
export class ProductVariants extends BaseCollection {}
export const productVariantEntity = {
  tableName: 'product_variant',
  columns: [
    'id',
    { column: 'product_id', references: Product },
    { column: 'actual_product_variant_id', references: ActualProductVariant },
    { column: 'color_id', references: Color },
    { column: 'gender_id', references: Gender },
    { column: 'size_id', references: Size },
    'shopify_id',
    'shopify_storefront_id',
    'barcode',
    'price',
    'hidden',
    'compare_at_price',
    'created_date',
    'updated_date',
    'grams',
    'requires_shipping'
  ] as IColumns,
  Model: ProductVariant,
  Collection: ProductVariants
};

export class ProductVariantImage extends Base {}
export class ProductVariantImages extends BaseCollection {}
export const productVariantImageEntity = {
  tableName: 'product_variant_image',
  columns: [
    'id',
    { column: 'product_variant_id', references: ProductVariant },
    'image_url_full',
    'position'
  ] as IColumns,
  Model: ProductVariantImage,
  Collection: ProductVariantImages
};

export class PhysicalAddress extends Base {}
export class PhysicalAddresses extends BaseCollection {}
export const physicalAddressEntity = {
  tableName: 'physical_address',
  columns: [
    'id',
    'address1',
    'address2',
    'city',
    'province',
    'zip',
    'country',
    'province_code',
    'country_code',
    'latitude',
    'longitude'
  ] as IColumns,
  Model: PhysicalAddress,
  Collection: PhysicalAddresses
};

export class InventoryLocation extends Base {}
export class InventoryLocations extends BaseCollection {}
export const inventoryLocationEntity = {
  tableName: 'inventory_location',
  /* kujo really does list physical_address_id twice - once as a plain string
   * and once carrying the reference. Kept verbatim: entity setup has to
   * tolerate it, and the fixture should not be tidier than the application.
   */
  columns: [
    'id',
    'physical_address_id',
    { column: 'physical_address_id', references: PhysicalAddress },
    'name',
    'shopify_id',
    'updated_date'
  ] as IColumns,
  Model: InventoryLocation,
  Collection: InventoryLocations
};

export class InventoryLevel extends Base {}
export class InventoryLevels extends BaseCollection {
  get totalAvailable(): number {
    return (
      this.models.reduce(
        (sum: number, level: any) => sum + +level.available,
        0
      ) || 0
    );
  }
}
export const inventoryLevelEntity = {
  tableName: 'inventory_level',
  columns: [
    'id',
    { column: 'inventory_location_id', references: InventoryLocation },
    { column: 'actual_product_variant_id', references: ActualProductVariant },
    'available',
    'updated_date'
  ] as IColumns,
  Model: InventoryLevel,
  Collection: InventoryLevels
};

/* kujo's Shipment derives display strings in its constructor (via
 * moment-timezone there; plain Date here to stay dependency-free). The shape
 * matters: model constructors in real applications do work, and the ORM's
 * contract is to run each exactly once per materialized model.
 */
export class Shipment extends Base {
  constructor(props: any = {}) {
    super(Object.assign({}, props, {}));
    this._initializeDerivedData();
  }

  _initializeDerivedData(): void {
    if (this.sellableDate) {
      const date = new Date(this.sellableDate);
      this.sellableDateLocale = date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      this.sellableDateOnlyLocale = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      this.sellableDateOnlyISO = date.toISOString().slice(0, 10);
    }
  }
}
export class Shipments extends BaseCollection {}
export const shipmentEntity = {
  tableName: 'shipment',
  columns: [
    'id',
    { column: 'inventory_location_id', references: InventoryLocation },
    'sellable_date'
  ] as IColumns,
  Model: Shipment,
  Collection: Shipments
};

export class ShipmentActualProductVariant extends Base {}
export class ShipmentActualProductVariants extends BaseCollection {}
export const shipmentActualProductVariantEntity = {
  tableName: 'shipment_actual_product_variant',
  columns: [
    'id',
    { column: 'shipment_id', references: Shipment },
    { column: 'actual_product_variant_id', references: ActualProductVariant },
    'quantity',
    'updated_date'
  ] as IColumns,
  Model: ShipmentActualProductVariant,
  Collection: ShipmentActualProductVariants
};

export class Catalog extends Base {}
export class Catalogs extends BaseCollection {}
export const catalogEntity = {
  tableName: 'catalog',
  columns: ['id', 'value', 'label'] as IColumns,
  Model: Catalog,
  Collection: Catalogs
};

export class CatalogProductVariant extends Base {}
export class CatalogProductVariants extends BaseCollection {}
export const catalogProductVariantEntity = {
  tableName: 'catalog_product_variant',
  columns: [
    'id',
    { column: 'catalog_id', references: Catalog },
    { column: 'product_variant_id', references: ProductVariant },
    'price'
  ] as IColumns,
  Model: CatalogProductVariant,
  Collection: CatalogProductVariants
};
