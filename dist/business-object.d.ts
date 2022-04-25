export interface ColumnDataObject {
    column: string;
    property?: string;
    references?: EntityConstructor;
    primaryKey?: boolean;
}
export declare type ColumnData = ColumnDataObject & string;
export declare abstract class Entity {
    static readonly tableName: string;
    static readonly sqlColumnsData: Array<ColumnData>;
    static readonly displayName?: string;
    readonly BoCollection: EntityCollectionConstructor;
    [key: string]: any;
}
export declare type EntityConstructor = (new (props: object) => Entity) & Omit<typeof Entity, never>;
export declare abstract class EntityCollection {
    static readonly Bo: EntityConstructor;
    static readonly displayName?: string;
    abstract models: Array<Entity>;
}
export declare type EntityCollectionConstructor = (new (props: object) => Entity) & Omit<typeof Entity, never>;
export declare const getPrimaryKey: (Bo: EntityConstructor) => Array<string>;
export declare const getProperties: (Bo: EntityConstructor) => Array<string>;
export declare const getSqlColumns: (Bo: EntityConstructor) => Array<string>;
export declare const getReferences: (Bo: EntityConstructor) => object;
export declare const getDisplayName: (Bo: EntityConstructor) => string;
export declare const getTableName: (bo: Entity) => string;
export declare const getCollectionDisplayName: (bo: Entity) => string;
export declare const getPrefixedColumnNames: (Bo: EntityConstructor) => Array<string>;
export declare const getColumns: (Bo: EntityConstructor) => string;
export declare const getId: (bo: Entity) => string;
export declare const nestClump: (clump: Array<Array<Entity>>) => object;
export declare const clumpIntoGroups: (processed: Array<Array<Entity>>) => Array<Array<Array<Entity>>>;
export declare const mapToBos: (objectified: any, getBusinessObjects: () => Array<EntityConstructor>) => Entity[];
export declare const objectifyDatabaseResult: (result: object) => any;
export declare const createFromDatabase: (_result: Array<object> | object, getBusinessObjects: () => Array<EntityConstructor>) => any;
export declare const createOneFromDatabase: (_result: any, getBusinessObjects: () => Array<EntityConstructor>) => any;
export declare const createOneOrNoneFromDatabase: (_result: any, getBusinessObjects: () => Array<EntityConstructor>) => any;
export declare const createManyFromDatabase: (_result: any, getBusinessObjects: () => Array<EntityConstructor>) => any;
export declare const getSqlInsertParts: (bo: Entity) => {
    columns: string;
    values: any[];
    valuesVar: string[];
};
export declare const getSqlUpdateParts: (bo: Entity, on?: string) => {
    clause: string;
    idVar: string;
    values: any[];
};
export declare const getMatchingParts: (bo: Entity) => {
    whereClause: string;
    values: any[];
};
export declare const getMatchingPartsObject: (bo: Entity) => {
    whereClause: string;
    values: any;
};
export declare const getNewWith: (bo: Entity, sqlColumns: any, values: any) => any;
export declare const getValueBySqlColumn: (bo: Entity, sqlColumn: string) => any;
