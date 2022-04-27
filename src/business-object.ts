const camelCase = require('camelcase');

export interface IColumnData {
  column: string;
  property?: string;
  references?: IEntityClass;
  primaryKey?: boolean;
}
export type IColumn = IColumnData & string;
type IColumns = Array<IColumn>;

export interface IEntity {
  [key:string]: any;
}
// IEntity used as a type refers to an instance of IEntity;
// IEntityClass used as a type refers to the class itself 
export type IEntityClass = (new (props: any) => IEntity);
export interface ICollection<T> {
  models: Array<T>;
}
export interface IPureORMData<T> {
  tableName: string;
  displayName?: string;
  collectionDisplayName?: string;
  columns: IColumns;
  entityClass: (new (props: any) => T)
  collectionClass: (new ({models}: any) => ICollection<T>);
}
export type IPureORMDataArray<T> = Array<IPureORMData<T>>;


export const getPrimaryKey = (data: IPureORMData<any>): Array<string> => {
  const pkColumnsData = data.columns.filter((x: IColumn) => x.primaryKey);
  const primaryKeys = pkColumnsData.map((x: IColumn) => x.column);
  return primaryKeys.length > 0 ? primaryKeys : ['id'];
};

export const getProperties = (data: IPureORMData<any>): Array<string> => {
  return data.columns.map((x: IColumn): string => x.property || camelCase(x.column || x));
};

export const getSqlColumns = (data: IPureORMData<any>): Array<string> => {
  return data.columns.map((x: IColumn): string => x.column || x);
};

export const getReferences = (data: IPureORMData<any>): object => {
  return data.columns
    .filter((x: IColumn) => x.references)
    .reduce(
      (accum: any, item: IColumn) =>
        Object.assign({}, accum, {
          [item.property || camelCase(item.column || item)]: item.references
        }),
      {}
    );
};

export const getDisplayName = (data: IPureORMData<any>): string => {
  return data.displayName || camelCase(data.tableName);
};

export const getPrefixedColumnNames = (data: IPureORMData<any>): Array<string> => {
  return getSqlColumns(data).map((col: string) => `${data.tableName}#${col}`);
};

export const getColumns = (data: IPureORMData<any>): string => {
  return getPrefixedColumnNames(data)
    .map(
      (prefixed: string, index: number) =>
        `"${data.tableName}".${getSqlColumns(data)[index]} as "${prefixed}"`
    )
    .join(', ');
};

export const getPureORMDataByTableName = (
  tableName: string,
  getPureORMDataArray: () => IPureORMDataArray<any>
): IPureORMData<any> => {
  const pureORMData = getPureORMDataArray().find(data => data.tableName == tableName);
  if (!pureORMData) {
    throw new Error(`Could not find pureORMData for table ${tableName}`);
  }
  return pureORMData;
};

export const getPureORMDataByEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): IPureORMData<any> => {
  const pureORMData = getPureORMDataArray().find(data => data.entityClass == entity.constructor);
  if (!pureORMData) {
    throw new Error(`Could not find pureORMData for class ${entity.constructor}`);
  }
  return pureORMData;
};

export const getDisplayNameForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getDisplayName(pureORMData);
};

export const getColumnsForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getColumns(pureORMData);
};

export const getPropertiesForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): Array<string> => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getProperties(pureORMData);
};

export const getSqlColumnsForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): Array<string> => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getSqlColumns(pureORMData);
};

export const getPrimaryKeyForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): Array<string> => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getPrimaryKey(pureORMData);
};

export const getTableNameForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return pureORMData.tableName;
};

export const getReferencesForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): object => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getReferences(pureORMData);
};

export const getCollectionDisplayNameForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return pureORMData.collectionDisplayName
    || `${getDisplayName(pureORMData)}s`;
};

// Returns unique identifier of entity (the values of the primary keys)
export const getIdForEntity = (
  entity: IEntity,
  getPureORMDataArray: () => IPureORMDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, getPureORMDataArray);
  return getPrimaryKey(pureORMData)
    .map((key: string) => entity[key as keyof typeof entity])
    .join('');
};

/*
 * In:
 *  [
 *    [Article {id: 32}, ArticleTag {id: 54}]
 *    [Article {id: 32}, ArticleTag {id: 55}]
 *  ]
 * Out:
 *  Article {id: 32, ArticleTags articleTags: [ArticleTag {id: 54}, ArticleTag {id: 55}]
 */
export const nestClump = (
  clump: Array<Array<IEntity>>,
  getPureORMDataArray: () => IPureORMDataArray<any>
): object => {
  clump = clump.map((x: Array<IEntity>) => Object.values(x));
  const root = clump[0][0];
  clump = clump.map(
    (row: Array<IEntity>) => row.filter(
      (item: IEntity, index: number) => index !== 0
    )
  );
  const built = { [getDisplayNameForEntity(root, getPureORMDataArray)]: root };

  let nodes = [root];

  // Wowzer is this both CPU and Memory inefficient
  clump.forEach((array: Array<IEntity>) => {
    array.forEach((_entity: IEntity) => {
      const nodeAlreadySeen = nodes.find(
        (x: IEntity) =>
          x.constructor.name === _entity.constructor.name
          && getIdForEntity(x, getPureORMDataArray) === getIdForEntity(_entity, getPureORMDataArray)
      );
      const entity = nodeAlreadySeen || _entity;
      const isNodeAlreadySeen = !!nodeAlreadySeen;
      const nodePointingToIt = nodes.find(node => {
        const indexes = Object.values(getReferencesForEntity(node, getPureORMDataArray))
          .map((x: IEntityClass, i: number) => (x === entity.constructor ? i : null))
          .filter((x: number | null, i) => x != null) as Array<number>;
        if (!indexes.length) {
          return false;
        }
        for (const index of indexes) {
          const property = Object.keys(getReferencesForEntity(node, getPureORMDataArray))[index];
          if (node[property] === entity.id) {
            return true;
          }
        }
        return false;
      });
      // For first obj type which is has an instance in nodes array,
      // get its index in nodes array
      const indexOfOldestParent = array.reduce((answer: number | null, obj: IEntity) => {
        if (answer != null) {
          return answer;
        }
        const index = nodes.findIndex(n => n.constructor === obj.constructor);
        if (index !== -1) {
          return index;
        }
        return null;
      }, null) || 0;
      const parentHeirarchy = [
        root,
        ...nodes.slice(0, indexOfOldestParent + 1).reverse()
      ];
      const nodeItPointsTo = parentHeirarchy.find(parent => {
        const index = Object.values(getReferencesForEntity(entity, getPureORMDataArray)).indexOf(
          parent.constructor
        );
        if (index === -1) {
          return false;
        }
        const property = Object.keys(getReferencesForEntity(entity, getPureORMDataArray))[index];
        return entity[property as keyof typeof entity] === parent.id;
      });
      if (isNodeAlreadySeen) {
        if (nodeItPointsTo && !nodePointingToIt) {
          nodes = [entity, ...nodes];
          return;
        }
        // If the nodePointingToIt (eg, parcel_event) is part of an
        // existing collection on this node (eg, parcel) which is a
        // nodeAlreadySeen, early return so we don't create it (parcel) on
        // the nodePointingToIt (parcel_event), since it (parcel) has been
        // shown to be the parent (of parcel_events).
        if (nodePointingToIt) {
          const ec = entity[getCollectionDisplayNameForEntity(nodePointingToIt, getPureORMDataArray) as keyof typeof entity];
          if (ec && ec.models.find((m: IEntity) => m === nodePointingToIt)) {
            nodes = [entity, ...nodes];
            return;
          }
        }
      }
      if (nodePointingToIt) {
        nodePointingToIt[getDisplayNameForEntity(entity, getPureORMDataArray)] = entity;
      } else if (nodeItPointsTo) {
        let collection = nodeItPointsTo[getCollectionDisplayNameForEntity(entity, getPureORMDataArray)];
        if (collection) {
          collection.models.push(entity);
        } else {
          nodeItPointsTo[getCollectionDisplayNameForEntity(entity, getPureORMDataArray)] = new entity.BoCollection({
            models: [entity]
          });
        }
      } else {
        if (!getIdForEntity(entity, getPureORMDataArray)) {
          // If the join is fruitless; todo: add a test for this path
          return;
        }
        throw Error(`Could not find how this BO fits: ${JSON.stringify(entity)}`);
      }
      nodes = [entity, ...nodes];
    });
  });

  return built;
};

/*
 * Clump array of flat objects into groups based on id of root
 * In:
 *  [
 *    [Article {id: 32}, ArticleTag {id: 54}]
 *    [Article {id: 32}, ArticleTag {id: 55}]
 *    [Article {id: 33}, ArticleTag {id: 56}]
 *  ]
 * Out:
 *  [
 *    [
 *      [Article {id: 32}, ArticleTag {id: 54}]
 *      [Article {id: 32}, ArticleTag {id: 55}]
 *    ]
 *    [
 *      [Article {id: 33}, ArticleTag {id: 56}]
 *    ]
 *  ]
 */
export const clumpIntoGroups = (
  processed: Array<Array<IEntity>>,
  getPureORMDataArray: () => IPureORMDataArray<any>
): Array<Array<Array<IEntity>>> => {
  const root = processed[0][0];
  const rootBo = root.constructor;
  const clumps = processed.reduce((accum: any, item: Array<IEntity>) => {
    const id = getPrimaryKeyForEntity(root, getPureORMDataArray)
      .map((key: string) => item.find((x: IEntity) => x.constructor === rootBo)?.[key])
      .join('@');
    if (accum.has(id)) {
      accum.set(id, [...accum.get(id), item]);
    } else {
      accum.set(id, [item]);
    }
    return accum;
  }, new Map());
  return [...clumps.values()];
};

export const mapToBos = (objectified: any, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  return Object.keys(objectified).map(tableName => {
    const pureORMData = getPureORMDataByTableName(tableName, getPureORMDataArray);
    const propified = Object.keys(objectified[tableName]).reduce(
      (obj: any, column) => {
        let propertyName = getProperties(pureORMData)[getSqlColumns(pureORMData).indexOf(column)];
        if (!propertyName) {
          if (column.startsWith('meta_')) {
            propertyName = camelCase(column);
          } else {
            throw Error(
              `No property name for "${column}" in business object "${getDisplayName(
                pureORMData
              )}". Non-spec'd columns must begin with "meta_".`
            );
          }
        }
        obj[propertyName] = objectified[tableName][column];
        return obj;
      },
      {}
    );
    return new pureORMData.entityClass(propified);
  });
};

/*
 * Make objects (based on special table#column names) from flat database
 * return value.
 */
export const objectifyDatabaseResult = (result: object) => {
  return Object.keys(result).reduce((obj: any, text: string) => {
    const tableName = text.split('#')[0];
    const column = text.split('#')[1];
    obj[tableName] = obj[tableName] || {};
    obj[tableName][column] = result[text as keyof typeof result];
    return obj;
  }, {});
};

export const createFromDatabase = (_result: Array<object> | object, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  const result = Array.isArray(_result) ? _result : [_result];
  const objectified = result.map(objectifyDatabaseResult);
  const boified = objectified.map((x: any) => mapToBos(x, getPureORMDataArray));
  const clumps = clumpIntoGroups(boified, getPureORMDataArray);
  const nested = clumps.map(x => nestClump(x, getPureORMDataArray));
  const models = nested.map(n => Object.values(n)[0]);
  return models.length ? new models[0].BoCollection({ models }) : void 0;
};

export const createOneFromDatabase = (_result: any, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  const collection = createFromDatabase(_result, getPureORMDataArray);
  if (!collection || collection.models.length === 0) {
    throw Error('Did not get one.');
  } else if (collection.models.length > 1) {
    throw Error('Got more than one.');
  }
  return collection.models[0];
};

export const createOneOrNoneFromDatabase = (_result: any, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  if (!_result) {
    return _result;
  }
  const collection = createFromDatabase(_result, getPureORMDataArray);
  if (collection && collection.models.length > 1) {
    throw Error('Got more than one.');
  }
  return collection && collection.models[0];
};

export const createManyFromDatabase = (_result: any, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  const collection = createFromDatabase(_result, getPureORMDataArray);
  if (!collection || collection.models.length === 0) {
    throw Error('Did not get at least one.');
  }
  return collection;
};

export const getSqlInsertParts = (entity: IEntity, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  const columns = getSqlColumnsForEntity(entity, getPureORMDataArray)
    .filter(
      (column: string, index: number) => entity[getPropertiesForEntity(entity, getPureORMDataArray)[index] as keyof typeof entity] !== void 0
    )
    .map((col: string) => `"${col}"`)
    .join(', ');
  const values = getPropertiesForEntity(entity, getPureORMDataArray)
    .map((property: string) => entity[property as keyof typeof entity])
    .filter((value: any) => value !== void 0);
  const valuesVar = values.map((value: any, index: number) => `$${index + 1}`);
  return { columns, values, valuesVar };
};

export const getSqlUpdateParts = (entity: IEntity, getPureORMDataArray: () => IPureORMDataArray<any>, on = 'id') => {
  const clauseArray = getSqlColumnsForEntity(entity, getPureORMDataArray)
    .filter(
      (sqlColumn: string, index: number) => entity[getPropertiesForEntity(entity, getPureORMDataArray)[index] as keyof typeof entity] !== void 0
    )
    .map((sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`);
  const clause = clauseArray.join(', ');
  const idVar = `$${clauseArray.length + 1}`;
  const _values = getPropertiesForEntity(entity, getPureORMDataArray)
    .map((property: string) => entity[property as keyof typeof entity])
    .filter((value: any) => value !== void 0);
  const values = [..._values, entity[on as keyof typeof entity]];
  return { clause, idVar, values };
};

export const getMatchingParts = (entity: IEntity, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  const whereClause = getPropertiesForEntity(entity, getPureORMDataArray)
    .map((property: string, index: number) =>
      entity[property as keyof typeof entity] != null
        ? `"${getTableNameForEntity(entity, getPureORMDataArray)}"."${
            getSqlColumnsForEntity(entity, getPureORMDataArray)[index]
          }"`
        : null
    )
    .filter((x: string | null) => x != null)
    .map((x: string | null, i: number) => `${x} = $${i + 1}`)
    .join(' AND ');
  const values = getPropertiesForEntity(entity, getPureORMDataArray)
    .map((property: string) => (entity[property as keyof typeof entity] != null ? entity[property as keyof typeof entity] : null))
    .filter((x: any) => x != null);
  return { whereClause, values };
};

// This one returns an object, which allows it to be more versatile.
// To-do: make this one even better and use it instead of the one above.
export const getMatchingPartsObject = (entity: IEntity, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  const whereClause = getPropertiesForEntity(entity, getPureORMDataArray)
    .map((property: string, index: number) =>
      entity[property as keyof typeof entity] != null
        ? `"${getTableNameForEntity(entity, getPureORMDataArray)}"."${
            getSqlColumnsForEntity(entity, getPureORMDataArray)[index]
          }"`
        : null
    )
    .filter((x: string | null) => x != null)
    .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
    .join(' AND ');
  const values = getPropertiesForEntity(entity, getPureORMDataArray)
    .map((property: string) => (entity[property as keyof typeof entity] != null ? entity[property as keyof typeof entity] : null))
    .filter((x: any) => x != null)
    .reduce(
      (accum: any, val: any, index: number) => Object.assign({}, accum, { [index + 1]: val }),
      {}
    );
  return { whereClause, values };
};

export const getNewWith = (entity: IEntity, sqlColumns: any, values: any) => {
  const Constructor = entity.constructor as any;
  const entityKeys = sqlColumns.map(
    (key: string) => getProperties(Constructor)[getSqlColumns(Constructor).indexOf(key)]
  );
  const entityData = entityKeys.reduce((data: any, key: string, index: number) => {
    data[key] = values[index];
    return data;
  }, {});
  return new Constructor(entityData);
};

export const getValueBySqlColumn = (entity: IEntity, sqlColumn: string, getPureORMDataArray: () => IPureORMDataArray<any>) => {
  return entity[
    getPropertiesForEntity(entity, getPureORMDataArray)[
      getSqlColumnsForEntity(entity, getPureORMDataArray).indexOf(sqlColumn)
    ] as keyof typeof entity
  ];
};
