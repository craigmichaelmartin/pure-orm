import { Entity, EntityConstructor } from './business-object';
interface PureORM {
    one: (query: string, params: object) => Entity;
    oneOrNone: (query: string, params: object) => Entity | void;
    many: (query: string, params: object) => Array<Entity>;
    any: (query: string, params: object) => Array<Entity> | void;
    none: (query: string, params: object) => void;
    getMatching: (bo: Entity) => Entity;
    getOneOrNoneMatching: (bo: Entity) => Entity | void;
    getAnyMatching: (bo: Entity) => Array<Entity> | void;
    getAllMatching: (bo: Entity) => Array<Entity>;
    create: (bo: Entity) => Entity;
    update: (bo: Entity) => Entity;
    delete: (bo: Entity) => void;
    deleteMatching: (bo: Entity) => void;
    tables: Array<EntityConstructor>;
}
interface CreateOptions {
    getBusinessObjects: () => Array<EntityConstructor>;
    db: any;
    logError: (err: Error) => void;
}
export declare const create: ({ getBusinessObjects, db, logError }: CreateOptions) => PureORM;
export {};
