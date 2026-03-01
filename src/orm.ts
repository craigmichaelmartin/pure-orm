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

  interface IOrmHelperPlan {
    quotedColumns: Array<string>;
    updateClausePrefixes: Array<string>;
    wherePositionalPrefixes: Array<string>;
    whereNamedPrefixes: Array<string>;
  }

  const helperPlanByEntity = new Map<any, IOrmHelperPlan>();
  const getHelperPlan = (entity: any): IOrmHelperPlan => {
    let plan = helperPlanByEntity.get(entity);
    if (!plan) {
      const quotedColumns = new Array(entity.columnNames.length);
      const updateClausePrefixes = new Array(entity.columnNames.length);
      const wherePositionalPrefixes = new Array(entity.columnNames.length);
      const whereNamedPrefixes = new Array(entity.columnNames.length);
      for (let i = 0; i < entity.columnNames.length; i++) {
        const column = entity.columnNames[i];
        quotedColumns[i] = `"${column}"`;
        updateClausePrefixes[i] = `"${column}" = $`;
        wherePositionalPrefixes[i] = `"${entity.tableName}"."${column}" = $`;
        whereNamedPrefixes[i] = `"${entity.tableName}"."${column}" = $(`;
      }
      plan = {
        quotedColumns,
        updateClausePrefixes,
        wherePositionalPrefixes,
        whereNamedPrefixes
      };
      helperPlanByEntity.set(entity, plan);
    }
    return plan;
  };

  const getSqlInsertParts = (
    model: IModel
  ): { columns: string; values: Array<string>; valuesVar: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { columnNames, propertyNames } = entity;
    const helperPlan = getHelperPlan(entity);
    let columns = '';
    const values: Array<any> = [];
    const valuesVar: Array<string> = [];
    let paramIndex = 1;
    for (let i = 0; i < columnNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val !== void 0) {
        if (columns) {
          columns += ', ';
        }
        columns += helperPlan.quotedColumns[i];
        values.push(val);
        valuesVar.push(`$${paramIndex}`);
        paramIndex++;
      }
    }
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (
    model: IModel,
    on = 'id'
  ): { clause: string; idVar: string; values: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { columnNames, propertyNames } = entity;
    const helperPlan = getHelperPlan(entity);
    let clause = '';
    const values: Array<any> = [];
    let paramIndex = 1;
    for (let i = 0; i < columnNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val !== void 0) {
        if (clause) {
          clause += ', ';
        }
        clause += helperPlan.updateClausePrefixes[i] + paramIndex;
        values.push(val);
        paramIndex++;
      }
    }
    const idVar = `$${paramIndex}`;
    values.push(model[on as keyof typeof model]);
    return { clause, idVar, values };
  };

  const getMatchingParts = (
    model: IModel
  ): { whereClause: string; values: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { propertyNames, columnNames } = entity;
    const helperPlan = getHelperPlan(entity);
    const values: Array<any> = [];
    let paramIndex = 1;
    let whereClause = '';
    for (let i = 0; i < propertyNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val != null) {
        if (whereClause) {
          whereClause += ' AND ';
        }
        whereClause += helperPlan.wherePositionalPrefixes[i] + paramIndex;
        values.push(val);
        paramIndex++;
      }
    }
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (
    model: IModel
  ): { whereClause: string; values: Array<string> } => {
    const entity = orm.getEntityByModel(model);
    const { propertyNames, columnNames } = entity;
    const helperPlan = getHelperPlan(entity);
    const values: any = {};
    let paramIndex = 1;
    let whereClause = '';
    for (let i = 0; i < propertyNames.length; i++) {
      const val = model[propertyNames[i] as keyof typeof model];
      if (val != null) {
        if (whereClause) {
          whereClause += ' AND ';
        }
        whereClause += helperPlan.whereNamedPrefixes[i] + paramIndex + ')';
        values[paramIndex] = val;
        paramIndex++;
      }
    }
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
    return propertyName
      ? model[propertyName as keyof typeof model]
      : (undefined as any);
  };

  const getSqlColumnForPropertyName = (
    model: IModel,
    propertyName: string
  ): string => {
    const entity = orm.getEntityByModel(model);
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
