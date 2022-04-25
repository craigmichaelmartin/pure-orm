"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValueBySqlColumn = exports.getNewWith = exports.getMatchingPartsObject = exports.getMatchingParts = exports.getSqlUpdateParts = exports.getSqlInsertParts = exports.createManyFromDatabase = exports.createOneOrNoneFromDatabase = exports.createOneFromDatabase = exports.createFromDatabase = exports.objectifyDatabaseResult = exports.mapToBos = exports.clumpIntoGroups = exports.nestClump = exports.getId = exports.getColumns = exports.getPrefixedColumnNames = exports.getCollectionDisplayName = exports.getTableName = exports.getDisplayName = exports.getReferences = exports.getSqlColumns = exports.getProperties = exports.getPrimaryKey = exports.EntityCollection = exports.Entity = void 0;
const camelCase = require('camelcase');
class Entity {
}
exports.Entity = Entity;
class EntityCollection {
}
exports.EntityCollection = EntityCollection;
const getPrimaryKey = (Bo) => {
    const pkColumnsData = Bo.sqlColumnsData.filter((x) => x.primaryKey);
    const primaryKeys = pkColumnsData.map((x) => x.column);
    return primaryKeys.length > 0 ? primaryKeys : ['id'];
};
exports.getPrimaryKey = getPrimaryKey;
const getProperties = (Bo) => {
    return Bo.sqlColumnsData.map((x) => x.property || camelCase(x.column || x));
};
exports.getProperties = getProperties;
const getSqlColumns = (Bo) => {
    return Bo.sqlColumnsData.map((x) => x.column || x);
};
exports.getSqlColumns = getSqlColumns;
const getReferences = (Bo) => {
    return Bo.sqlColumnsData
        .filter((x) => x.references)
        .reduce((accum, item) => Object.assign({}, accum, {
        [item.property || camelCase(item.column || item)]: item.references
    }), {});
};
exports.getReferences = getReferences;
const getDisplayName = (Bo) => {
    return Bo.displayName || camelCase(Bo.tableName);
};
exports.getDisplayName = getDisplayName;
const getTableName = (bo) => {
    return bo.constructor.tableName;
};
exports.getTableName = getTableName;
const getCollectionDisplayName = (bo) => {
    return (bo.BoCollection).displayName
        || `${(0, exports.getDisplayName)(bo.constructor)}s`;
};
exports.getCollectionDisplayName = getCollectionDisplayName;
const getPrefixedColumnNames = (Bo) => {
    return (0, exports.getSqlColumns)(Bo).map((col) => `${Bo.tableName}#${col}`);
};
exports.getPrefixedColumnNames = getPrefixedColumnNames;
const getColumns = (Bo) => {
    return (0, exports.getPrefixedColumnNames)(Bo)
        .map((prefixed, index) => `"${Bo.tableName}".${(0, exports.getSqlColumns)(Bo)[index]} as "${prefixed}"`)
        .join(', ');
};
exports.getColumns = getColumns;
// Returns unique identifier of bo (the values of the primary keys)
const getId = (bo) => {
    return (0, exports.getPrimaryKey)(bo.constructor)
        .map((key) => bo[key])
        .join('');
};
exports.getId = getId;
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
    clump = clump.map((x) => Object.values(x));
    const root = clump[0][0];
    clump = clump.map((row) => row.filter((item, index) => index !== 0));
    const built = { [(0, exports.getDisplayName)(root.constructor)]: root };
    let nodes = [root];
    // Wowzer is this both CPU and Memory inefficient
    clump.forEach((array) => {
        array.forEach((_bo) => {
            const nodeAlreadySeen = nodes.find((x) => x.constructor.name === _bo.constructor.name && (0, exports.getId)(x) === (0, exports.getId)(_bo));
            const bo = nodeAlreadySeen || _bo;
            const isNodeAlreadySeen = !!nodeAlreadySeen;
            const nodePointingToIt = nodes.find(node => {
                const indexes = Object.values((0, exports.getReferences)(node.constructor))
                    .map((x, i) => (x === bo.constructor ? i : null))
                    .filter((x, i) => x != null);
                if (!indexes.length) {
                    return false;
                }
                for (const index of indexes) {
                    const property = Object.keys((0, exports.getReferences)(node.constructor))[index];
                    if (node[property] === bo.id) {
                        return true;
                    }
                }
                return false;
            });
            // For first obj type which is has an instance in nodes array,
            // get its index in nodes array
            const indexOfOldestParent = array.reduce((answer, obj) => {
                if (answer != 0) {
                    return answer;
                }
                const index = nodes.findIndex(n => n.constructor === obj.constructor);
                if (index !== -1) {
                    return index;
                }
                return 0;
            }, 0);
            const parentHeirarchy = [
                root,
                ...nodes.slice(0, indexOfOldestParent + 1).reverse()
            ];
            const nodeItPointsTo = parentHeirarchy.find(parent => {
                const index = Object.values((0, exports.getReferences)(bo.constructor)).indexOf(parent.constructor);
                if (index === -1) {
                    return false;
                }
                const property = Object.keys((0, exports.getReferences)(bo.constructor))[index];
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
                if (nodePointingToIt) {
                    const ec = bo[(0, exports.getCollectionDisplayName)(nodePointingToIt)];
                    if (ec && ec.models.find((m) => m === nodePointingToIt)) {
                        nodes = [bo, ...nodes];
                        return;
                    }
                }
            }
            if (nodePointingToIt) {
                nodePointingToIt[(0, exports.getDisplayName)(bo.constructor)] = bo;
            }
            else if (nodeItPointsTo) {
                let collection = nodeItPointsTo[(0, exports.getCollectionDisplayName)(bo)];
                if (collection) {
                    collection.models.push(bo);
                }
                else {
                    nodeItPointsTo[(0, exports.getCollectionDisplayName)(bo)] = new bo.BoCollection({
                        models: [bo]
                    });
                }
            }
            else {
                if (!(0, exports.getId)(bo)) {
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
exports.nestClump = nestClump;
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
        const id = (0, exports.getPrimaryKey)(rootBo)
            .map((key) => { var _a; return (_a = item.find((x) => x.constructor === rootBo)) === null || _a === void 0 ? void 0 : _a[key]; })
            .join('@');
        if (accum.has(id)) {
            accum.set(id, [...accum.get(id), item]);
        }
        else {
            accum.set(id, [item]);
        }
        return accum;
    }, new Map());
    return [...clumps.values()];
};
exports.clumpIntoGroups = clumpIntoGroups;
const mapToBos = (objectified, getBusinessObjects) => {
    return Object.keys(objectified).map(tableName => {
        const Bo = getBusinessObjects().find((Bo) => Bo.tableName === tableName);
        if (!Bo) {
            throw Error(`No business object with table name "${tableName}"`);
        }
        const propified = Object.keys(objectified[tableName]).reduce((obj, column) => {
            let propertyName = (0, exports.getProperties)(Bo)[(0, exports.getSqlColumns)(Bo).indexOf(column)];
            if (!propertyName) {
                if (column.startsWith('meta_')) {
                    propertyName = camelCase(column);
                }
                else {
                    throw Error(`No property name for "${column}" in business object "${(0, exports.getDisplayName)(Bo)}". Non-spec'd columns must begin with "meta_".`);
                }
            }
            obj[propertyName] = objectified[tableName][column];
            return obj;
        }, {});
        return new Bo(propified);
    });
};
exports.mapToBos = mapToBos;
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
exports.objectifyDatabaseResult = objectifyDatabaseResult;
const createFromDatabase = (_result, getBusinessObjects) => {
    const result = Array.isArray(_result) ? _result : [_result];
    const objectified = result.map(exports.objectifyDatabaseResult);
    const boified = objectified.map((x) => (0, exports.mapToBos)(x, getBusinessObjects));
    const clumps = (0, exports.clumpIntoGroups)(boified);
    const nested = clumps.map(exports.nestClump);
    const models = nested.map(n => Object.values(n)[0]);
    return models.length ? new models[0].BoCollection({ models }) : void 0;
};
exports.createFromDatabase = createFromDatabase;
const createOneFromDatabase = (_result, getBusinessObjects) => {
    const collection = (0, exports.createFromDatabase)(_result, getBusinessObjects);
    if (!collection || collection.models.length === 0) {
        throw Error('Did not get one.');
    }
    else if (collection.models.length > 1) {
        throw Error('Got more than one.');
    }
    return collection.models[0];
};
exports.createOneFromDatabase = createOneFromDatabase;
const createOneOrNoneFromDatabase = (_result, getBusinessObjects) => {
    if (!_result) {
        return _result;
    }
    const collection = (0, exports.createFromDatabase)(_result, getBusinessObjects);
    if (collection && collection.models.length > 1) {
        throw Error('Got more than one.');
    }
    return collection && collection.models[0];
};
exports.createOneOrNoneFromDatabase = createOneOrNoneFromDatabase;
const createManyFromDatabase = (_result, getBusinessObjects) => {
    const collection = (0, exports.createFromDatabase)(_result, getBusinessObjects);
    if (!collection || collection.models.length === 0) {
        throw Error('Did not get at least one.');
    }
    return collection;
};
exports.createManyFromDatabase = createManyFromDatabase;
const getSqlInsertParts = (bo) => {
    const columns = (0, exports.getSqlColumns)(bo.constructor)
        .filter((column, index) => bo[(0, exports.getProperties)(bo.constructor)[index]] !== void 0)
        .map((col) => `"${col}"`)
        .join(', ');
    const values = (0, exports.getProperties)(bo.constructor)
        .map((property) => bo[property])
        .filter((value) => value !== void 0);
    const valuesVar = values.map((value, index) => `$${index + 1}`);
    return { columns, values, valuesVar };
};
exports.getSqlInsertParts = getSqlInsertParts;
const getSqlUpdateParts = (bo, on = 'id') => {
    const clauseArray = (0, exports.getSqlColumns)(bo.constructor)
        .filter((sqlColumn, index) => bo[(0, exports.getProperties)(bo.constructor)[index]] !== void 0)
        .map((sqlColumn, index) => `"${sqlColumn}" = $${index + 1}`);
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = (0, exports.getProperties)(bo.constructor)
        .map((property) => bo[property])
        .filter((value) => value !== void 0);
    const values = [..._values, bo[on]];
    return { clause, idVar, values };
};
exports.getSqlUpdateParts = getSqlUpdateParts;
const getMatchingParts = (bo) => {
    const whereClause = (0, exports.getProperties)(bo.constructor)
        .map((property, index) => bo[property] != null
        ? `"${bo.constructor.tableName}"."${(0, exports.getSqlColumns)(bo.constructor)[index]}"`
        : null)
        .filter((x) => x != null)
        .map((x, i) => `${x} = $${i + 1}`)
        .join(' AND ');
    const values = (0, exports.getProperties)(bo.constructor)
        .map((property) => (bo[property] != null ? bo[property] : null))
        .filter((x) => x != null);
    return { whereClause, values };
};
exports.getMatchingParts = getMatchingParts;
// This one returns an object, which allows it to be more versatile.
// To-do: make this one even better and use it instead of the one above.
const getMatchingPartsObject = (bo) => {
    const whereClause = (0, exports.getProperties)(bo.constructor)
        .map((property, index) => bo[property] != null
        ? `"${bo.constructor.tableName}"."${(0, exports.getSqlColumns)(bo.constructor)[index]}"`
        : null)
        .filter((x) => x != null)
        .map((x, i) => `${x} = $(${i + 1})`)
        .join(' AND ');
    const values = (0, exports.getProperties)(bo.constructor)
        .map((property) => (bo[property] != null ? bo[property] : null))
        .filter((x) => x != null)
        .reduce((accum, val, index) => Object.assign({}, accum, { [index + 1]: val }), {});
    return { whereClause, values };
};
exports.getMatchingPartsObject = getMatchingPartsObject;
const getNewWith = (bo, sqlColumns, values) => {
    const Constructor = bo.constructor;
    const boKeys = sqlColumns.map((key) => (0, exports.getProperties)(Constructor)[(0, exports.getSqlColumns)(Constructor).indexOf(key)]);
    const boData = boKeys.reduce((data, key, index) => {
        data[key] = values[index];
        return data;
    }, {});
    return new Constructor(boData);
};
exports.getNewWith = getNewWith;
const getValueBySqlColumn = (bo, sqlColumn) => {
    return bo[(0, exports.getProperties)(bo.constructor)[(0, exports.getSqlColumns)(bo.constructor).indexOf(sqlColumn)]];
};
exports.getValueBySqlColumn = getValueBySqlColumn;
