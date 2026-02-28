import { createCore, IModel, ICollection, IEntities } from './core';
import { ICoreIntegratedDriver } from './driver-integrations/index';
import { createForPGP } from './driver-integrations/pgp';

export interface ICreateOptions {
  entities: IEntities<IModel>;
  db: any;
  logError?: (err: Error) => never;
}

export interface IPureORM extends ICoreIntegratedDriver {
  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  /* These are just provided because they are so common and straight-forward.
   * While the goal of this library is foster writing SQL in your data access
   * layer (which returns pure business objects) some CRUD operations are so
   * common they are included in the ORM. Feel free to completely disregard
   * if you want to write these in your data access layer yourself.
   */

  getMatching: <T extends IModel>(model: T) => Promise<T>;
  getOneOrNoneMatching: <T extends IModel>(model: T) => Promise<T | void>;
  getAnyMatching: <T extends ICollection<IModel>>(
    model: IModel
  ) => Promise<T | void>;
  getAllMatching: <T extends ICollection<IModel>>(model: IModel) => Promise<T>;
  create: <T extends IModel>(model: T) => Promise<T>;
  update: <T extends IModel>(model: T, options?: { on: string }) => Promise<T>;
  delete: <T extends IModel>(model: T) => Promise<void>;
  deleteMatching: <T extends IModel>(model: T) => Promise<void>;

  /* ------------------------------------------------------------------------*/
  /* Helper Utility Functions -----------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  getSqlInsertParts: (model: IModel) => {
    columns: string;
    values: Array<string>;
    valuesVar: Array<string>;
  };
  getSqlUpdateParts: (
    model: IModel,
    on?: string
  ) => { clause: string; idVar: string; values: Array<string> };
  getMatchingParts: (model: IModel) => {
    whereClause: string;
    values: Array<string>;
  };
  getMatchingPartsObject: (model: IModel) => {
    whereClause: string;
    values: Array<string>;
  };
  getNewWith: (model: IModel, sqlColumns: any, values: any) => IModel;
  getValueBySqlColumn: (model: IModel, sqlColumn: string) => string;
  getSqlColumnForPropertyName: (model: IModel, propertyName: string) => string;
}

export const create = ({
  entities: externalEntities,
  db,
  logError
}: ICreateOptions): IPureORM => {
  const core = createCore({ entities: externalEntities });

  let orm: ICoreIntegratedDriver;
  if (db.$config.pgp) {
    orm = createForPGP({ core, db, logError });
  } else {
    throw new Error(
      `You're database driver is not yet supported. You can make a PR to add it, or use the \`createCore\` export which doesn't try to abstract over the database driver, and instead you pass the results of the database driver queries to it.`
    );
  }

  /* ------------------------------------------------------------------------*/
  /* Helper Utilities for CRUD functions ------------------------------------*/
  /* ------------------------------------------------------------------------*/

  const getSqlInsertParts = (
    model: IModel
  ): { columns: string; values: Array<string>; valuesVar: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { columnNames, propertyNames } = entity;
    const cols: Array<string> = [];
    const values: Array<any> = [];
    for (let i = 0; i < columnNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val !== void 0) {
        cols.push(`"${columnNames[i]}"`);
        values.push(val);
      }
    }
    const columns = cols.join(', ');
    const valuesVar = values.map(
      (_: any, index: number) => `$${index + 1}`
    );
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (
    model: IModel,
    on = 'id'
  ): { clause: string; idVar: string; values: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { columnNames, propertyNames } = entity;
    const clauseParts: Array<string> = [];
    const values: Array<any> = [];
    let paramIndex = 1;
    for (let i = 0; i < columnNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val !== void 0) {
        clauseParts.push(`"${columnNames[i]}" = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }
    }
    const clause = clauseParts.join(', ');
    const idVar = `$${paramIndex}`;
    values.push(model[on as keyof typeof model]);
    return { clause, idVar, values };
  };

  const getMatchingParts = (
    model: IModel
  ): { whereClause: string; values: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { propertyNames, columnNames, tableName } = entity;
    const whereParts: Array<string> = [];
    const values: Array<any> = [];
    let paramIndex = 1;
    for (let i = 0; i < propertyNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val != null) {
        whereParts.push(
          `"${tableName}"."${columnNames[i]}" = $${paramIndex}`
        );
        values.push(val);
        paramIndex++;
      }
    }
    const whereClause = whereParts.join(' AND ');
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (
    model: IModel
  ): { whereClause: string; values: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { propertyNames, columnNames, tableName } = entity;
    const whereParts: Array<string> = [];
    const values: any = {};
    let paramIndex = 1;
    for (let i = 0; i < propertyNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val != null) {
        whereParts.push(
          `"${tableName}"."${columnNames[i]}" = $(${paramIndex})`
        );
        values[paramIndex] = val;
        paramIndex++;
      }
    }
    const whereClause = whereParts.join(' AND ');
    return { whereClause, values };
  };

  const getNewWith = (model: IModel, sqlColumns: any, values: any): IModel => {
    const Constructor = model.constructor as any;
    const entity = orm.getEntityByModel(model);
    const modelData: any = {};
    for (let i = 0; i < sqlColumns.length; i++) {
      const propertyName = entity.columnToPropertyMap.get(sqlColumns[i]);
      if (propertyName) {
        modelData[propertyName] = values[i];
      }
    }
    return new Constructor(modelData);
  };

  const getValueBySqlColumn = (model: IModel, sqlColumn: string): string => {
    const entity = orm.getEntityByModel(model);
    const propertyName = entity.columnToPropertyMap.get(sqlColumn);
    return propertyName ? model[propertyName as keyof typeof model] : (undefined as any);
  };

  const getSqlColumnForPropertyName = (
    model: IModel,
    propertyName: string
  ): string => {
    const entity = orm.getEntityByModel(model);
    const idx = entity.propertyNames.indexOf(propertyName);
    return entity.columnNames[idx];
  };

  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  // Standard create
  const create = <T extends IModel>(model: T): Promise<T> => {
    const entity = orm.getEntityByModel(model);
    const { columns, values, valuesVar } = getSqlInsertParts(model);
    const query = `
      INSERT INTO "${entity.tableName}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${entity.selectColumnsClause};
    `;
    return orm.one<T>(query, values);
  };

  // Standard update
  const update = <T extends IModel>(
    model: T,
    { on = 'id' } = {}
  ): Promise<T> => {
    const entity = orm.getEntityByModel(model);
    const { clause, idVar, values } = getSqlUpdateParts(model, on);
    const query = `
      UPDATE "${entity.tableName}"
      SET ${clause}
      WHERE "${entity.tableName}".${getSqlColumnForPropertyName(model, on)} = ${idVar}
      RETURNING ${entity.selectColumnsClause};
    `;
    return orm.one<T>(query, values);
  };

  // Standard delete
  const _delete = <T extends IModel>(model: T): Promise<void> => {
    const entity = orm.getEntityByModel(model);
    const id = (model as any).id;
    const query = `
      DELETE FROM "${entity.tableName}"
      WHERE "${entity.tableName}".id = $(id)
    `;
    return orm.none(query, { id });
  };

  const deleteMatching = <T extends IModel>(model: T): Promise<void> => {
    const entity = orm.getEntityByModel(model);
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      DELETE FROM "${entity.tableName}"
      WHERE ${whereClause};
    `;
    return orm.none(query, values);
  };

  const getMatching = <T extends IModel>(model: T): Promise<T> => {
    const entity = orm.getEntityByModel(model);
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${entity.selectColumnsClause}
      FROM "${entity.tableName}"
      WHERE ${whereClause};
    `;
    return orm.one<T>(query, values);
  };

  const getOneOrNoneMatching = <T extends IModel>(
    model: T
  ): Promise<T | void> => {
    const entity = orm.getEntityByModel(model);
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${entity.selectColumnsClause}
      FROM "${entity.tableName}"
      WHERE ${whereClause};
    `;
    return orm.oneOrNone<T>(query, values);
  };

  const getAnyMatching = <T extends ICollection<IModel>>(
    model: IModel
  ): Promise<T | void> => {
    const entity = orm.getEntityByModel(model);
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${entity.selectColumnsClause}
      FROM "${entity.tableName}"
      WHERE ${whereClause};
    `;
    return orm.any<T>(query, values);
  };

  const getAllMatching = <T extends ICollection<IModel>>(
    model: IModel
  ): Promise<T> => {
    const entity = orm.getEntityByModel(model);
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${entity.selectColumnsClause}
      FROM "${entity.tableName}"
      WHERE ${whereClause};
    `;
    return orm.many<T>(query, values);
  };

  return Object.assign({}, orm, {
    // Built-in basic CRUD functions
    create,
    update,
    delete: _delete,
    deleteMatching,
    getMatching,
    getOneOrNoneMatching,
    getAnyMatching,
    getAllMatching,
    // Helper Utility functions
    getSqlInsertParts,
    getSqlUpdateParts,
    getMatchingParts,
    getMatchingPartsObject,
    getNewWith,
    getValueBySqlColumn,
    getSqlColumnForPropertyName
  });
};
