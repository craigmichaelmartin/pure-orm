const camelCase = require('camelcase');

export interface ColumnDataObject {
  column: string;
  property?: string;
  references?: EntityConstructor;
  primaryKey?: boolean;
}
export type ColumnData = ColumnDataObject & string;

export abstract class Entity {
  static readonly tableName: string;
  static readonly sqlColumnsData: Array<ColumnData>;
  static readonly displayName?: string;
  readonly BoCollection!: EntityCollectionConstructor;
  [key:string]: any;
}
export type EntityConstructor = (new (props: object) => Entity) & Omit<typeof Entity, never>;

export abstract class EntityCollection {
  static readonly Bo: EntityConstructor;
  static readonly displayName?: string;
  abstract models: Array<Entity>;
}
export type EntityCollectionConstructor = (new (props: object) => Entity) & Omit<typeof Entity, never>;


export const getPrimaryKey = (Bo: EntityConstructor): Array<string> => {
  const pkColumnsData = Bo.sqlColumnsData.filter((x: ColumnData) => x.primaryKey);
  const primaryKeys = pkColumnsData.map((x: ColumnData) => x.column);
  return primaryKeys.length > 0 ? primaryKeys : ['id'];
};

export const getProperties = (Bo: EntityConstructor): Array<string> => {
  return Bo.sqlColumnsData.map((x: ColumnData): string => x.property || camelCase(x.column || x));
};

export const getSqlColumns = (Bo: EntityConstructor): Array<string> => {
  return Bo.sqlColumnsData.map((x: ColumnData): string => x.column || x);
};

export const getReferences = (Bo: EntityConstructor): object => {
  return Bo.sqlColumnsData
    .filter((x: ColumnData) => x.references)
    .reduce(
      (accum: any, item: ColumnData) =>
        Object.assign({}, accum, {
          [item.property || camelCase(item.column || item)]: item.references
        }),
      {}
    );
};

export const getDisplayName = (Bo: EntityConstructor): string => {
  return Bo.displayName || camelCase(Bo.tableName);
};

export const getTableName = (bo: Entity): string => {
  return (bo.constructor as EntityConstructor).tableName;
};

export const getCollectionDisplayName = (bo: Entity): string => {
  return (bo.BoCollection).displayName
    || `${getDisplayName(bo.constructor as EntityConstructor)}s`;
};

export const getPrefixedColumnNames = (Bo: EntityConstructor): Array<string> => {
  return getSqlColumns(Bo).map((col: string) => `${Bo.tableName}#${col}`);
};

export const getColumns = (Bo: EntityConstructor): string => {
  return getPrefixedColumnNames(Bo)
    .map(
      (prefixed: string, index: number) =>
        `"${Bo.tableName}".${getSqlColumns(Bo)[index]} as "${prefixed}"`
    )
    .join(', ');
};

// Returns unique identifier of bo (the values of the primary keys)
export const getId = (bo: Entity): string => {
  return getPrimaryKey(bo.constructor as EntityConstructor)
    .map((key: string) => bo[key as keyof typeof bo])
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
export const nestClump = (clump: Array<Array<Entity>>): object => {
  clump = clump.map((x: Array<Entity>) => Object.values(x));
  const root = clump[0][0];
  clump = clump.map(
    (row: Array<Entity>) => row.filter(
      (item: Entity, index: number) => index !== 0
    )
  );
  const built = { [getDisplayName(root.constructor as EntityConstructor)]: root };

  let nodes = [root];

  // Wowzer is this both CPU and Memory inefficient
  clump.forEach((array: Array<Entity>) => {
    array.forEach((_bo: Entity) => {
      const nodeAlreadySeen = nodes.find(
        (x: Entity) =>
          x.constructor.name === _bo.constructor.name && getId(x) === getId(_bo)
      );
      const bo = nodeAlreadySeen || _bo;
      const isNodeAlreadySeen = !!nodeAlreadySeen;
      const nodePointingToIt = nodes.find(node => {
        const indexes = Object.values(getReferences(node.constructor as EntityConstructor))
          .map((x: EntityConstructor, i: number) => (x === bo.constructor ? i : null))
          .filter((x: number | null, i) => x != null) as Array<number>;
        if (!indexes.length) {
          return false;
        }
        for (const index of indexes) {
          const property = Object.keys(getReferences(node.constructor as EntityConstructor))[index];
          if (node[property] === bo.id) {
            return true;
          }
        }
        return false;
      });
      // For first obj type which is has an instance in nodes array,
      // get its index in nodes array
      const indexOfOldestParent = array.reduce((answer: number | null, obj: Entity) => {
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
        const index = Object.values(getReferences(bo.constructor as EntityConstructor)).indexOf(
          parent.constructor
        );
        if (index === -1) {
          return false;
        }
        const property = Object.keys(getReferences(bo.constructor as EntityConstructor))[index];
        return bo[property as keyof typeof bo] === parent.id;
      });
      if (isNodeAlreadySeen) {
        if (nodeItPointsTo && !nodePointingToIt) {
          nodes = [bo, ...nodes];
          return;
        }
        // If the nodePointingToIt (eg, parcel_event) is part of an
        // existing collection on this node (eg, parcel) which is a
        // nodeAlreadySeen, early return so we don't create it (parcel) on
        // the nodePointingToIt (parcel_event), since it (parcel) has been
        // shown to be the parent (of parcel_events).
        if (nodePointingToIt) {
          const ec = bo[getCollectionDisplayName(nodePointingToIt) as keyof typeof bo];
          if (ec && ec.models.find((m: Entity) => m === nodePointingToIt)) {
            nodes = [bo, ...nodes];
            return;
          }
        }
      }
      if (nodePointingToIt) {
        nodePointingToIt[getDisplayName(bo.constructor as EntityConstructor)] = bo;
      } else if (nodeItPointsTo) {
        let collection = nodeItPointsTo[getCollectionDisplayName(bo)];
        if (collection) {
          collection.models.push(bo);
        } else {
          nodeItPointsTo[getCollectionDisplayName(bo)] = new bo.BoCollection({
            models: [bo]
          });
        }
      } else {
        if (!getId(bo)) {
          // If the join is fruitless; todo: add a test for this path
          return;
        }
        throw Error(`Could not find how this BO fits: ${JSON.stringify(bo)}`);
      }
      nodes = [bo, ...nodes];
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
export const clumpIntoGroups = (processed: Array<Array<Entity>>): Array<Array<Array<Entity>>> => {
  const rootBo = processed[0][0].constructor;
  const clumps = processed.reduce((accum: any, item: Array<Entity>) => {
    const id = getPrimaryKey(rootBo as EntityConstructor)
      .map((key: string) => item.find((x: Entity) => x.constructor === rootBo)?.[key])
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

export const mapToBos = (objectified: any, getBusinessObjects: () => Array<EntityConstructor>) => {
  return Object.keys(objectified).map(tableName => {
    const Bo = getBusinessObjects().find((Bo: EntityConstructor) => Bo.tableName === tableName);
    if (!Bo) {
      throw Error(`No business object with table name "${tableName}"`);
    }
    const propified = Object.keys(objectified[tableName]).reduce(
      (obj: any, column) => {
        let propertyName = getProperties(Bo)[getSqlColumns(Bo).indexOf(column)];
        if (!propertyName) {
          if (column.startsWith('meta_')) {
            propertyName = camelCase(column);
          } else {
            throw Error(
              `No property name for "${column}" in business object "${getDisplayName(
                Bo
              )}". Non-spec'd columns must begin with "meta_".`
            );
          }
        }
        obj[propertyName] = objectified[tableName][column];
        return obj;
      },
      {}
    );
    return new Bo(propified);
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

export const createFromDatabase = (_result: Array<object> | object, getBusinessObjects: () => Array<EntityConstructor>) => {
  const result = Array.isArray(_result) ? _result : [_result];
  const objectified = result.map(objectifyDatabaseResult);
  const boified = objectified.map((x: any) => mapToBos(x, getBusinessObjects));
  const clumps = clumpIntoGroups(boified);
  const nested = clumps.map(nestClump);
  const models = nested.map(n => Object.values(n)[0]);
  return models.length ? new models[0].BoCollection({ models }) : void 0;
};

export const createOneFromDatabase = (_result: any, getBusinessObjects: () => Array<EntityConstructor>) => {
  const collection = createFromDatabase(_result, getBusinessObjects);
  if (!collection || collection.models.length === 0) {
    throw Error('Did not get one.');
  } else if (collection.models.length > 1) {
    throw Error('Got more than one.');
  }
  return collection.models[0];
};

export const createOneOrNoneFromDatabase = (_result: any, getBusinessObjects: () => Array<EntityConstructor>) => {
  if (!_result) {
    return _result;
  }
  const collection = createFromDatabase(_result, getBusinessObjects);
  if (collection && collection.models.length > 1) {
    throw Error('Got more than one.');
  }
  return collection && collection.models[0];
};

export const createManyFromDatabase = (_result: any, getBusinessObjects: () => Array<EntityConstructor>) => {
  const collection = createFromDatabase(_result, getBusinessObjects);
  if (!collection || collection.models.length === 0) {
    throw Error('Did not get at least one.');
  }
  return collection;
};

export const getSqlInsertParts = (bo: Entity) => {
  const columns = getSqlColumns(bo.constructor as EntityConstructor)
    .filter(
      (column: string, index: number) => bo[getProperties(bo.constructor as EntityConstructor)[index] as keyof typeof bo] !== void 0
    )
    .map((col: string) => `"${col}"`)
    .join(', ');
  const values = getProperties(bo.constructor as EntityConstructor)
    .map((property: string) => bo[property as keyof typeof bo])
    .filter((value: any) => value !== void 0);
  const valuesVar = values.map((value: any, index: number) => `$${index + 1}`);
  return { columns, values, valuesVar };
};

export const getSqlUpdateParts = (bo: Entity, on = 'id') => {
  const clauseArray = getSqlColumns(bo.constructor as EntityConstructor)
    .filter(
      (sqlColumn: string, index: number) => bo[getProperties(bo.constructor as EntityConstructor)[index] as keyof typeof bo] !== void 0
    )
    .map((sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`);
  const clause = clauseArray.join(', ');
  const idVar = `$${clauseArray.length + 1}`;
  const _values = getProperties(bo.constructor as EntityConstructor)
    .map((property: string) => bo[property as keyof typeof bo])
    .filter((value: any) => value !== void 0);
  const values = [..._values, bo[on as keyof typeof bo]];
  return { clause, idVar, values };
};

export const getMatchingParts = (bo: Entity) => {
  const whereClause = getProperties(bo.constructor as EntityConstructor)
    .map((property: string, index: number) =>
      bo[property as keyof typeof bo] != null
        ? `"${(bo.constructor as EntityConstructor).tableName}"."${
            getSqlColumns(bo.constructor as EntityConstructor)[index]
          }"`
        : null
    )
    .filter((x: string | null) => x != null)
    .map((x: string | null, i: number) => `${x} = $${i + 1}`)
    .join(' AND ');
  const values = getProperties(bo.constructor as EntityConstructor)
    .map((property: string) => (bo[property as keyof typeof bo] != null ? bo[property as keyof typeof bo] : null))
    .filter((x: any) => x != null);
  return { whereClause, values };
};

// This one returns an object, which allows it to be more versatile.
// To-do: make this one even better and use it instead of the one above.
export const getMatchingPartsObject = (bo: Entity) => {
  const whereClause = getProperties(bo.constructor as EntityConstructor)
    .map((property: string, index: number) =>
      bo[property as keyof typeof bo] != null
        ? `"${(bo.constructor as EntityConstructor).tableName}"."${
            getSqlColumns(bo.constructor as EntityConstructor)[index]
          }"`
        : null
    )
    .filter((x: string | null) => x != null)
    .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
    .join(' AND ');
  const values = getProperties(bo.constructor as EntityConstructor)
    .map((property: string) => (bo[property as keyof typeof bo] != null ? bo[property as keyof typeof bo] : null))
    .filter((x: any) => x != null)
    .reduce(
      (accum: any, val: any, index: number) => Object.assign({}, accum, { [index + 1]: val }),
      {}
    );
  return { whereClause, values };
};

export const getNewWith = (bo: Entity, sqlColumns: any, values: any) => {
  const Constructor = bo.constructor as any;
  const boKeys = sqlColumns.map(
    (key: string) => getProperties(Constructor)[getSqlColumns(Constructor).indexOf(key)]
  );
  const boData = boKeys.reduce((data: any, key: string, index: number) => {
    data[key] = values[index];
    return data;
  }, {});
  return new Constructor(boData);
};

export const getValueBySqlColumn = (bo: Entity, sqlColumn: string) => {
  return bo[
    getProperties(bo.constructor as EntityConstructor)[
      getSqlColumns(bo.constructor as EntityConstructor).indexOf(sqlColumn)
    ] as keyof typeof bo
  ];
};
