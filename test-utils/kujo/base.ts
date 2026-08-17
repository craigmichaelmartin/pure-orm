/* Mirrors the kujo application's model base classes (models/base.ts and
 * models/base-collection.ts). The construction style matters for realism:
 * kujo models build themselves with a single `Object.assign(this, props)`
 * rather than one property store per declared field, and kujo collections
 * default `models` and expose iteration helpers. Benchmarks and specs built
 * on these classes exercise pure-orm the way its heaviest real consumer does.
 */

export class Base {
  [key: string]: any;
  constructor(props: any) {
    Object.assign(this, props);
  }
}

export class BaseCollection {
  [key: string]: any;
  models: Array<any>;
  constructor(props: any = {}) {
    this.models = props.models || [];
  }

  map(fn: any): Array<any> {
    return this.models.map(fn);
  }

  forEach(fn: any): void {
    (this.models || []).forEach(fn);
  }

  find(predicate: any): any {
    return this.models.find(predicate);
  }

  filter(predicate: any): any {
    const Ctor = this.constructor as any;
    return new Ctor({ models: this.models.filter(predicate) });
  }

  get length(): number {
    return this.models.length;
  }
}
