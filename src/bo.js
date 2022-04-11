const camelCase = require('camelcase');

const getPrimaryKey = (Bo) => {
  const primaryKey = Bo.sqlColumnsData.filter(x => x.primaryKey);
  return primaryKey.length > 0 ? primaryKey : ['id'];
};

const getProperties = (Bo) => {
  return Bo.sqlColumnsData.map(
    x => x.property || camelCase(x.column || x)
  );
};

const getSqlColumns = (Bo) => {
  return Bo.sqlColumnsData.map(x => x.column || x);
};

const getReferences = (Bo) => {
  return Bo.sqlColumnsData
    .filter(x => x.references)
    .reduce(
      (accum, item) =>
        Object.assign({}, accum, {
          [item.property || camelCase(item.column || item)]: item.references
        }),
      {}
    );
};

const getDisplayName = (Bo) => {
  return camelCase(Bo.tableName);
};

const getCollectionDisplayName = (bo) => {
  return bo.BoCollection.displayName || `${getDisplayName(bo.constructor)}s`;
};

const getPrefixedColumnNames = (Bo) => {
  return getSqlColumns(Bo).map(col => `${Bo.tableName}#${col}`);
};

const getColumns = (Bo) => {
  return getPrefixedColumnNames(Bo)
    .map(
      (prefixed, index) =>
        `"${Bo.tableName}".${getSqlColumns(Bo)[index]} as "${prefixed}"`
    )
    .join(', ');
};

// Returns unique identifier of bo (the values of the primary keys)
const getId = (bo) => {
  return getPrimaryKey(bo.constructor)
    .map(key => bo[key])
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
const nestClump = (clump) => {
  clump = clump.map(x => Object.values(x)); // clump wasn't actually what I have documented
  const root = clump[0][0];
  clump = clump.map(row => row.filter((item, index) => index !== 0));
  const built = { [root.constructor.displayName]: root };

  let nodes = [root];

  // Wowzer is this both CPU and Memory inefficient
  clump.forEach(array => {
    array.forEach(_bo => {
      const nodeAlreadySeen = nodes.find(
        x =>
          x.constructor.name === _bo.constructor.name &&
          getId(x) === getId(_bo)
      );
      const bo = nodeAlreadySeen || _bo;
      const isNodeAlreadySeen = !!nodeAlreadySeen;
      const nodePointingToIt = nodes.find(node => {
        const indexes = Object.values(getReferences(node.constructor))
          .map((x, i) => (x === bo.constructor ? i : null))
          .filter(x => x != null);
        if (!indexes.length) {
          return false;
        }
        for (const index of indexes) {
          const property = Object.keys(getReferences(node.constructor))[index];
          if (node[property] === bo.id) {
            return true;
          }
        }
        return false;
      });
      // For first obj type which is has an instance in nodes array,
      // get its index in nodes array
      const indexOfOldestParent = array.reduce((answer, obj) => {
        if (answer != null) {
          return answer;
        }
        const index = nodes.findIndex(
          n => n.constructor === obj.constructor
        );
        if (index !== -1) {
          return index;
        }
        return null;
      }, null);
      const parentHeirarchy = [
        root,
        ...nodes.slice(0, indexOfOldestParent + 1).reverse()
      ];
      const nodeItPointsTo = parentHeirarchy.find(parent => {
        const index = Object.values(getReferences(bo.constructor)).indexOf(
          parent.constructor
        );
        if (index === -1) {
          return false;
        }
        const property = Object.keys(getReferences(bo.constructor))[index];
        return bo[property] === parent.id;
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
        const ec = bo[getCollectionDisplayName(nodePointingToIt)];
        if (ec && ec.models.find(m => m === nodePointingToIt)) {
          nodes = [bo, ...nodes];
          return;
        }
      }
      if (nodePointingToIt) {
        nodePointingToIt[getDisplayName(bo.constructor)] = bo;
      } else if (nodeItPointsTo) {
        let collection = nodeItPointsTo[getCollectionDisplayName(bo)];
        if (collection) {
          collection.models.push(bo);
        } else {
          nodeItPointsTo[getCollectionDisplayName(bo)] = new bo.BoCollection(
            { models: [bo] }
          );
        }
      } else {
        if (!getId(bo)) {
          // If the join is fruitless; todo: add a test for this path
          return;
        }
        throw Error(
          `Could not find how this BO fits: ${JSON.stringify(bo)}`
        );
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
const clumpIntoGroups = (processed) => {
  const rootBo = processed[0][0].constructor;
  const clumps = processed.reduce((accum, item) => {
    const id = getPrimaryKey(rootBo)
      .map(key => item.find(x => x.constructor === rootBo)[key])
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

const mapToBos = (objectified, getBusinessObjects) => {
  return Object.keys(objectified).map(tableName => {
    const Bo = getBusinessObjects().find(bo => bo.tableName === tableName);
    if (!Bo) {
      throw Error(`No business object with table name "${tableName}"`);
    }
    const propified = Object.keys(objectified[tableName]).reduce(
      (obj, column) => {
        let propertyName = getProperties(Bo)[getSqlColumns(Bo).indexOf(column)];
        if (!propertyName) {
          if (column.startsWith('meta_')) {
            propertyName = camelCase(column);
          } else {
            throw Error(
              `No property name for "${column}" in business object "${
                getDisplayName(Bo)
              }". Non-spec'd columns must begin with "meta_".`
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
const objectifyDatabaseResult = (result) => {
  return Object.keys(result).reduce((obj, text) => {
    const tableName = text.split('#')[0];
    const column = text.split('#')[1];
    obj[tableName] = obj[tableName] || {};
    obj[tableName][column] = result[text];
    return obj;
  }, {});
};

const createFromDatabase = (_result, getBusinessObjects) => {
  const result = Array.isArray(_result) ? _result : [_result];
  const objectified = result.map(objectifyDatabaseResult);
  const boified = objectified.map(x => mapToBos(x, getBusinessObjects));
  const clumps = clumpIntoGroups(boified);
  const nested = clumps.map(nestClump);
  const models = nested.map(n => Object.values(n)[0]);
  return models.length
    ? new (models[0].BoCollection)({ models })
    : void 0;
};

const createOneFromDatabase = (_result, getBusinessObjects) => {
  const collection = createFromDatabase(_result, getBusinessObjects);
  if (!collection || collection.models.length === 0) {
    throw Error('Did not get one.');
  } else if (collection.models.length > 1) {
    throw Error('Got more than one.');
  }
  return collection.models[0];
};

const createOneOrNoneFromDatabase = (_result, getBusinessObjects) => {
  if (!_result) {
    return _result;
  }
  const collection = createFromDatabase(_result, getBusinessObjects);
  if (collection && collection.models.length > 1) {
    throw Error('Got more than one.');
  }
  return collection && collection.models[0];
};

const createManyFromDatabase = (_result, getBusinessObjects) => {
  const collection = createFromDatabase(_result, getBusinessObjects);
  if (!collection || collection.models.length === 0) {
    throw Error('Did not get at least one.');
  }
  return collection;
};

const getSqlInsertParts = (bo) => {
  const columns = getSqlColumns(bo.constructor)
    .filter(
      (column, index) => bo[getProperties(bo.constructor)[index]] !== void 0
    )
    .map(col => `"${col}"`)
    .join(', ');
  const values = getProperties(bo.constructor)
    .map(property => bo[property])
    .filter(value => value !== void 0);
  const valuesVar = values.map((value, index) => `$${index + 1}`);
  return { columns, values, valuesVar };
};

const getSqlUpdateParts = (bo, on = 'id') => {
  const clauseArray = getSqlColumns(bo.constructor)
    .filter(
      (sqlColumn, index) => bo[getProperties(bo.constructor)[index]] !== void 0
    )
    .map((sqlColumn, index) => `"${sqlColumn}" = $${index + 1}`);
  const clause = clauseArray.join(', ');
  const idVar = `$${clauseArray.length + 1}`;
  const _values = getProperties(bo.constructor)
    .map(property => bo[property])
    .filter(value => value !== void 0);
  const values = [..._values, bo[on]];
  return { clause, idVar, values };
};

const getMatchingParts = (bo) => {
  const whereClause = getProperties(bo.constructor)
    .map((property, index) =>
      bo[property] != null
        ? `"${bo.constructor.tableName}"."${
            getSqlColumns(bo.constructor)[index]
          }"`
        : null
    )
    .filter(x => x != null)
    .map((x, i) => `${x} = $${i + 1}`)
    .join(' AND ');
  const values = getProperties(bo.constructor)
    .map(property => (bo[property] != null ? bo[property] : null))
    .filter(x => x != null);
  return { whereClause, values };
};

// This one returns an object, which allows it to be more versatile.
// To-do: make this one even better and use it instead of the one above.
const getMatchingPartsObject = (bo) => {
  const whereClause = getProperties(bo.constructor)
    .map((property, index) =>
      bo[property] != null
        ? `"${bo.constructor.tableName}"."${
            getSqlColumns(bo.constructor)[index]
          }"`
        : null
    )
    .filter(x => x != null)
    .map((x, i) => `${x} = $(${i + 1})`)
    .join(' AND ');
  const values = getProperties(bo.constructor)
    .map(property => (bo[property] != null ? bo[property] : null))
    .filter(x => x != null)
    .reduce(
      (accum, val, index) => Object.assign({}, accum, { [index + 1]: val }),
      {}
    );
  return { whereClause, values };
};

const getNewWith = (bo, sqlColumns, values) => {
  const Constructor = bo.constructor;
  const boKeys = sqlColumns.map(
    key => Constructor.properties[Constructor.sqlColumns.indexOf(key)]
  );
  const boData = boKeys.reduce((data, key, index) => {
    data[key] = values[index];
    return data;
  }, {});
  return new Constructor(boData);
};

const getValueBySqlColumn = (bo, sqlColumn) => {
  return bo[
    getProperties(bo.constructor)[getSqlColumns(bo.constructor).indexOf(sqlColumn)]
  ];
};


module.exports.getPrimaryKey = getPrimaryKey;
module.exports.getProperties = getProperties;
module.exports.getSqlColumns = getSqlColumns;
module.exports.getReferences = getReferences;
module.exports.getDisplayName = getDisplayName;
module.exports.getPrefixedColumnNames = getPrefixedColumnNames;
module.exports.getColumns = getColumns;
module.exports.nestClump = nestClump;
module.exports.clumpIntoGroups = clumpIntoGroups;
module.exports.mapToBos = mapToBos;
module.exports.objectifyDatabaseResult = objectifyDatabaseResult;
module.exports.createFromDatabase = createFromDatabase;
module.exports.createOneFromDatabase = createOneFromDatabase;
module.exports.createOneOrNoneFromDatabase = createOneOrNoneFromDatabase;
module.exports.createManyFromDatabase = createManyFromDatabase;
module.exports.getSqlInsertParts = getSqlInsertParts;
module.exports.getSqlUpdateParts = getSqlUpdateParts;
module.exports.getMatchingParts = getMatchingParts;
module.exports.getMatchingPartsObject = getMatchingPartsObject;
module.exports.getNewWith = getNewWith;
module.exports.getValueBySqlColumn = getValueBySqlColumn;
module.exports.getId = getId;
