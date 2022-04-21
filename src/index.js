const { create } = require('./factory');
module.exports.create = create;

const {
  getPrimaryKey,
  getProperties,
  getSqlColumns,
  getReferences,
  getDisplayName,
  getPrefixedColumnNames,
  getColumns,
  nestClump,
  clumpIntoGroups,
  mapToBos,
  objectifyDatabaseResult,
  createFromDatabase,
  createOneFromDatabase,
  createOneOrNoneFromDatabase,
  createManyFromDatabase,
  getSqlInsertParts,
  getSqlUpdateParts,
  getMatchingParts,
  getMatchingPartsObject,
  getNewWith,
  getValueBySqlColumn,
  getId
} = require('./business-object');

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
