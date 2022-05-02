import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'actual_product_variant';

export const columns: IColumns = ['id', 'sku'];

export class ActualProductVariant implements IModel {
  id: number;
  sku: string;

  constructor(props: any) {
    this.id = props.id;
    this.sku = props.sku;
  }
}

export class ActualProductVariants
  implements ICollection<ActualProductVariant>
{
  models: Array<ActualProductVariant>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const actualProductVariantEntity = {
  tableName,
  columns,
  Model: ActualProductVariant,
  Collection: ActualProductVariants
};
