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

  getMatching: <T extends IModel>(model: T) => T;
  getOneOrNoneMatching: <T extends IModel>(model: T) => T | void;
  getAnyMatching: <T extends ICollection<IModel>>(model: IModel) => T | void;
  getAllMatching: <T extends ICollection<IModel>>(model: IModel) => T;
  create: <T extends IModel>(model: T) => T;
  update: <T extends IModel>(model: T, options: { on: string }) => T;
  delete: <T extends IModel>(model: T) => void;
  deleteMatching: <T extends IModel>(model: T) => void;
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

  const getSqlInsertParts = (model: IModel) => {
    const columns = orm
      .getEntityByModel(model)
      .columnNames.filter(
        (column: string, index: number) =>
          model[
            orm.getEntityByModel(model).propertyNames[
              index
            ] as keyof typeof model
          ] !== void 0
      )
      .map((col: string) => `"${col}"`)
      .join(', ');
    const values = orm
      .getEntityByModel(model)
      .propertyNames.map(
        (property: string) => model[property as keyof typeof model]
      )
      .filter((value: any) => value !== void 0);
    const valuesVar = values.map(
      (value: any, index: number) => `$${index + 1}`
    );
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (model: IModel, on = 'id') => {
    const clauseArray = orm
      .getEntityByModel(model)
      .columnNames.filter(
        (sqlColumn: string, index: number) =>
          model[
            orm.getEntityByModel(model).propertyNames[
              index
            ] as keyof typeof model
          ] !== void 0
      )
      .map(
        (sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`
      );
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = orm
      .getEntityByModel(model)
      .propertyNames.map(
        (property: string) => model[property as keyof typeof model]
      )
      .filter((value: any) => value !== void 0);
    const values = [..._values, model[on as keyof typeof model]];
    return { clause, idVar, values };
  };

  const getMatchingParts = (model: IModel) => {
    const whereClause = orm
      .getEntityByModel(model)
      .propertyNames.map((property: string, index: number) =>
        model[property as keyof typeof model] != null
          ? `"${orm.getEntityByModel(model).tableName}"."${
              orm.getEntityByModel(model).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $${i + 1}`)
      .join(' AND ');
    const values = orm
      .getEntityByModel(model)
      .propertyNames.map((property: string) =>
        model[property as keyof typeof model] != null
          ? model[property as keyof typeof model]
          : null
      )
      .filter((x: any) => x != null);
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (model: IModel) => {
    const whereClause = orm
      .getEntityByModel(model)
      .propertyNames.map((property: string, index: number) =>
        model[property as keyof typeof model] != null
          ? `"${orm.getEntityByModel(model).tableName}"."${
              orm.getEntityByModel(model).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
      .join(' AND ');
    const values = orm
      .getEntityByModel(model)
      .propertyNames.map((property: string) =>
        model[property as keyof typeof model] != null
          ? model[property as keyof typeof model]
          : null
      )
      .filter((x: any) => x != null)
      .reduce(
        (accum: any, val: any, index: number) =>
          Object.assign({}, accum, { [index + 1]: val }),
        {}
      );
    return { whereClause, values };
  };

  const getNewWith = (model: IModel, sqlColumns: any, values: any) => {
    const Constructor = model.constructor as any;
    const modelKeys = sqlColumns.map(
      (key: string) =>
        orm.getEntityByModel(model).propertyNames[
          orm.getEntityByModel(model).columnNames.indexOf(key)
        ]
    );
    const modelData = modelKeys.reduce(
      (data: any, key: string, index: number) => {
        data[key] = values[index];
        return data;
      },
      {}
    );
    return new Constructor(modelData);
  };

  const getValueBySqlColumn = (model: IModel, sqlColumn: string) => {
    return model[
      orm.getEntityByModel(model).propertyNames[
        orm.getEntityByModel(model).columnNames.indexOf(sqlColumn)
      ] as keyof typeof model
    ];
  };

  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  // Standard create
  const create = <T extends IModel>(model: T): T => {
    const { columns, values, valuesVar } = getSqlInsertParts(model);
    const query = `
      INSERT INTO "${orm.getEntityByModel(model).tableName}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${orm.getEntityByModel(model).selectColumnsClause};
    `;
    return orm.one<T>(query, values);
  };

  // Standard update
  const update = <T extends IModel>(model: T, { on = 'id' } = {}): T => {
    const { clause, idVar, values } = getSqlUpdateParts(model, on);
    const query = `
      UPDATE "${orm.getEntityByModel(model).tableName}"
      SET ${clause}
      WHERE "${orm.getEntityByModel(model).tableName}".${on} = ${idVar}
      RETURNING ${orm.getEntityByModel(model).selectColumnsClause};
    `;
    return orm.one<T>(query, values);
  };

  // Standard delete
  const _delete = <T extends IModel>(model: T): void => {
    const id = (model as any).id;
    const query = `
      DELETE FROM "${orm.getEntityByModel(model).tableName}"
      WHERE "${orm.getEntityByModel(model).tableName}".id = $(id)
    `;
    return orm.none(query, { id });
  };

  const deleteMatching = <T extends IModel>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      DELETE FROM "${orm.getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return orm.none(query, values);
  };

  const getMatching = <T extends IModel>(model: T): T => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${orm.getEntityByModel(model).selectColumnsClause}
      FROM "${orm.getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return orm.one<T>(query, values);
  };

  const getOneOrNoneMatching = <T extends IModel>(model: T): T | void => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${orm.getEntityByModel(model).selectColumnsClause}
      FROM "${orm.getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return orm.oneOrNone<T>(query, values);
  };

  const getAnyMatching = <T extends ICollection<IModel>>(
    model: IModel
  ): T | void => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${orm.getEntityByModel(model).selectColumnsClause}
      FROM "${orm.getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return orm.any<T>(query, values);
  };

  const getAllMatching = <T extends ICollection<IModel>>(model: IModel): T => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${orm.getEntityByModel(model).selectColumnsClause}
      FROM "${orm.getEntityByModel(model).tableName}"
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
    getValueBySqlColumn
  });
};
