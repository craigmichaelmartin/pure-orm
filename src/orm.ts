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

  /* The generated SQL fragments depend only on *which* properties of a model
   * are set, never on their values. That "shape" is captured as a bit mask so
   * the clause strings and `$n` placeholder arrays are built once per shape
   * and reused, leaving only value collection on the hot path.
   */
  interface IOrmHelperPlan {
    entity: any;
    propertyNames: Array<string>;
    columnCount: number;
    quotedColumns: Array<string>;
    updateClausePrefixes: Array<string>;
    wherePositionalPrefixes: Array<string>;
    whereNamedPrefixes: Array<string>;
    insertCache: Map<
      number | string,
      { columns: string; valuesVar: Array<string> }
    >;
    updateCache: Map<number | string, { clause: string; idVar: string }>;
    matchingCache: Map<number | string, string>;
    matchingObjectCache: Map<number | string, string>;
  }

  const MAX_SHAPE_CACHE = 512;
  // Bit masks stay in SMI range; wider tables fall back to a packed string key.
  const MASK_COLUMN_LIMIT = 30;
  const WIDE_CHUNK_BITS = 15;

  const helperPlanByConstructor = new Map<any, IOrmHelperPlan>();
  const getHelperPlan = (model: IModel): IOrmHelperPlan => {
    const constructor = model.constructor;
    let plan = helperPlanByConstructor.get(constructor);
    if (plan === void 0) {
      const entity = orm.getEntityByModel(model);
      const columnCount = entity.columnNames.length;
      const quotedColumns = new Array(columnCount);
      const updateClausePrefixes = new Array(columnCount);
      const wherePositionalPrefixes = new Array(columnCount);
      const whereNamedPrefixes = new Array(columnCount);
      for (let i = 0; i < columnCount; i++) {
        const column = entity.columnNames[i];
        quotedColumns[i] = `"${column}"`;
        updateClausePrefixes[i] = `"${column}" = $`;
        wherePositionalPrefixes[i] = `"${entity.tableName}"."${column}" = $`;
        whereNamedPrefixes[i] = `"${entity.tableName}"."${column}" = $(`;
      }
      plan = {
        entity,
        propertyNames: entity.propertyNames,
        columnCount,
        quotedColumns,
        updateClausePrefixes,
        wherePositionalPrefixes,
        whereNamedPrefixes,
        insertCache: new Map(),
        updateCache: new Map(),
        matchingCache: new Map(),
        matchingObjectCache: new Map()
      };
      helperPlanByConstructor.set(constructor, plan);
    }
    return plan;
  };

  const cacheShape = <T>(
    cache: Map<number | string, T>,
    shapeKey: number | string,
    value: T
  ): T => {
    if (cache.size >= MAX_SHAPE_CACHE) {
      cache.clear();
    }
    cache.set(shapeKey, value);
    return value;
  };

  /* Wide-table fallback: pack the shape bits into a short string key. */
  const collectWide = (
    model: IModel,
    propertyNames: Array<string>,
    columnCount: number,
    values: Array<any>,
    skipNull: boolean
  ): string => {
    let shapeKey = '';
    let chunk = 0;
    let bit = 0;
    for (let i = 0; i < columnCount; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (skipNull ? val != null : val !== void 0) {
        chunk |= 1 << bit;
        values.push(val);
      }
      bit++;
      if (bit === WIDE_CHUNK_BITS) {
        shapeKey += String.fromCharCode(chunk);
        chunk = 0;
        bit = 0;
      }
    }
    if (bit > 0) {
      shapeKey += String.fromCharCode(chunk);
    }
    return shapeKey;
  };

  const getSqlInsertParts = (
    model: IModel
  ): { columns: string; values: Array<string>; valuesVar: Array<string> } => {
    const helperPlan = getHelperPlan(model);
    const { propertyNames, columnCount } = helperPlan;
    const values: Array<any> = [];
    let shapeKey: number | string;
    if (columnCount <= MASK_COLUMN_LIMIT) {
      let mask = 0;
      for (let i = 0; i < columnCount; i++) {
        const val = model[propertyNames[i] as keyof typeof model];
        if (val !== void 0) {
          mask |= 1 << i;
          values.push(val);
        }
      }
      shapeKey = mask;
    } else {
      shapeKey = collectWide(model, propertyNames, columnCount, values, false);
    }

    let cached = helperPlan.insertCache.get(shapeKey);
    if (cached === void 0) {
      let columns = '';
      const valuesVar: Array<string> = [];
      let paramIndex = 1;
      for (let i = 0; i < columnCount; i++) {
        if (model[propertyNames[i] as keyof typeof model] !== void 0) {
          if (columns) {
            columns += ', ';
          }
          columns += helperPlan.quotedColumns[i];
          valuesVar.push(`$${paramIndex}`);
          paramIndex++;
        }
      }
      cached = cacheShape(helperPlan.insertCache, shapeKey, {
        columns,
        valuesVar
      });
    }
    return {
      columns: cached.columns,
      values,
      valuesVar: cached.valuesVar.slice()
    };
  };

  const getSqlUpdateParts = (
    model: IModel,
    on = 'id'
  ): { clause: string; idVar: string; values: Array<string> } => {
    const helperPlan = getHelperPlan(model);
    const { propertyNames, columnCount } = helperPlan;
    const values: Array<any> = [];
    let shapeKey: number | string;
    if (columnCount <= MASK_COLUMN_LIMIT) {
      let mask = 0;
      for (let i = 0; i < columnCount; i++) {
        const val = model[propertyNames[i] as keyof typeof model];
        if (val !== void 0) {
          mask |= 1 << i;
          values.push(val);
        }
      }
      shapeKey = mask;
    } else {
      shapeKey = collectWide(model, propertyNames, columnCount, values, false);
    }

    let cached = helperPlan.updateCache.get(shapeKey);
    if (cached === void 0) {
      let clause = '';
      let paramIndex = 1;
      for (let i = 0; i < columnCount; i++) {
        if (model[propertyNames[i] as keyof typeof model] !== void 0) {
          if (clause) {
            clause += ', ';
          }
          clause += helperPlan.updateClausePrefixes[i] + paramIndex;
          paramIndex++;
        }
      }
      cached = cacheShape(helperPlan.updateCache, shapeKey, {
        clause,
        idVar: `$${paramIndex}`
      });
    }
    values.push(model[on as keyof typeof model]);
    return { clause: cached.clause, idVar: cached.idVar, values };
  };

  const getMatchingParts = (
    model: IModel
  ): { whereClause: string; values: Array<string> } => {
    const helperPlan = getHelperPlan(model);
    const { propertyNames, columnCount } = helperPlan;
    const values: Array<any> = [];
    let shapeKey: number | string;
    if (columnCount <= MASK_COLUMN_LIMIT) {
      let mask = 0;
      for (let i = 0; i < columnCount; i++) {
        const val = model[propertyNames[i] as keyof typeof model];
        if (val != null) {
          mask |= 1 << i;
          values.push(val);
        }
      }
      shapeKey = mask;
    } else {
      shapeKey = collectWide(model, propertyNames, columnCount, values, true);
    }

    let whereClause = helperPlan.matchingCache.get(shapeKey);
    if (whereClause === void 0) {
      whereClause = '';
      let paramIndex = 1;
      for (let i = 0; i < columnCount; i++) {
        if (model[propertyNames[i] as keyof typeof model] != null) {
          if (whereClause) {
            whereClause += ' AND ';
          }
          whereClause += helperPlan.wherePositionalPrefixes[i] + paramIndex;
          paramIndex++;
        }
      }
      cacheShape(helperPlan.matchingCache, shapeKey, whereClause);
    }
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (
    model: IModel
  ): { whereClause: string; values: Array<string> } => {
    const helperPlan = getHelperPlan(model);
    const { propertyNames, columnCount } = helperPlan;
    const values: any = {};
    let paramIndex = 1;
    let shapeKey: number | string;
    if (columnCount <= MASK_COLUMN_LIMIT) {
      let mask = 0;
      for (let i = 0; i < columnCount; i++) {
        const val = model[propertyNames[i] as keyof typeof model];
        if (val != null) {
          mask |= 1 << i;
          values[paramIndex] = val;
          paramIndex++;
        }
      }
      shapeKey = mask;
    } else {
      const wideValues: Array<any> = [];
      shapeKey = collectWide(
        model,
        propertyNames,
        columnCount,
        wideValues,
        true
      );
      for (let i = 0; i < wideValues.length; i++) {
        values[paramIndex] = wideValues[i];
        paramIndex++;
      }
    }

    let whereClause = helperPlan.matchingObjectCache.get(shapeKey);
    if (whereClause === void 0) {
      whereClause = '';
      let clauseIndex = 1;
      for (let i = 0; i < columnCount; i++) {
        if (model[propertyNames[i] as keyof typeof model] != null) {
          if (whereClause) {
            whereClause += ' AND ';
          }
          whereClause += helperPlan.whereNamedPrefixes[i] + clauseIndex + ')';
          clauseIndex++;
        }
      }
      cacheShape(helperPlan.matchingObjectCache, shapeKey, whereClause);
    }
    return { whereClause, values };
  };

  const getNewWith = (model: IModel, sqlColumns: any, values: any): IModel => {
    const Constructor = model.constructor as any;
    const entity = getHelperPlan(model).entity;
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
    const entity = getHelperPlan(model).entity;
    const propertyName = entity.columnToPropertyMap.get(sqlColumn);
    return propertyName
      ? model[propertyName as keyof typeof model]
      : (undefined as any);
  };

  const getSqlColumnForPropertyName = (
    model: IModel,
    propertyName: string
  ): string => {
    const entity = getHelperPlan(model).entity;
    const column = entity.propertyToColumnMap.get(propertyName);
    return column as string;
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
      WHERE "${entity.tableName}".${getSqlColumnForPropertyName(
      model,
      on
    )} = ${idVar}
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
