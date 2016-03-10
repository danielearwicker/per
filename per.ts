
export type Sink<T> = (v: T) => boolean|void;

export type Source<TIn, TOut> = (sink: Sink<TOut>, value?: TIn) => boolean|void;

export type Init<TIn, TOut> = TOut | TOut[] | Source<TIn, TOut>;

function toFunc<TIn, TOut>(valOrFunc: Init<TIn, TOut>, bindThis?: any): Source<TIn, TOut> {
    if (typeof valOrFunc !== "function") {
        return Array.isArray(valOrFunc)
            ? emit => valOrFunc.some(emit as any) // Array#some is typed to expect boolean
            : emit => emit(valOrFunc as TOut);
    } else {
        const func = valOrFunc as Source<TIn, TOut>;
        if (bindThis) {
            return (emit: Sink<TOut>, value: TIn) => func.call(bindThis, emit, value);
        }
        return func;
    }
}

export class Per<TIn, TOut> {
    forEach: Source<TIn, TOut>;

    constructor(valOrFunc: Init<TIn, TOut>, bindThis?: any) {
        this.forEach = toFunc(valOrFunc, bindThis);
    }

    per<TOut2>(valOrFunc: Init<TOut, TOut2> | Per<TOut, TOut2>, bindThis?: any) {
        const first = this.forEach;
        const second = per<TOut, TOut2>(valOrFunc, bindThis).forEach;
        return per<TIn, TOut2>((emit, value) => first(firstOut => second(emit, firstOut), value));
    }

    map<TOut2>(mapFunc: (value: TOut) => TOut2) {
        return this.per<TOut2>((emit, value) => emit(mapFunc(value)));
    }

    filter(predicate: (value: TOut) => boolean) {
        return this.per<TOut>((emit, value) => {
            if (predicate(value)) {
                return emit(value);
            }
        });
    }

    concat(second: Init<TIn, TOut>, secondThis?: any): Per<TIn, TOut>
    concat(second: Per<TIn, TOut>): Per<TIn, TOut>;
    concat(second: Init<TIn, TOut>| Per<TIn, TOut>, secondThis?: any) {
        const secondFunc = second instanceof Per ? second.forEach : toFunc(second, secondThis);
        var firstFunc = this.forEach;
        return per<TIn, TOut>((emit, value) =>
            firstFunc(emit, value) || secondFunc(emit, value));
    }

    skip(count: number) {
        return this.per<TOut>((emit, value) => {
            if (count > 0) {
                count--;
                return false;
            }
            return emit(value);
        });
    }

    take(count: number) {
        return this.per<TOut>((emit, value) => {
            if (count <= 0) {
                return true;
            }
            count--;
            return emit(value);
        })
    }

    listen(untilFunc: (value: TOut) => boolean) {
        return this.per<TOut>((emit, value) => {
            if (untilFunc(value)) {
                return true;
            }
            return emit(value);
        });
    }

    reduceWithSeed<TReduced>(reducer: (left: TReduced, right: TOut) => TReduced, seed: TReduced): Per<TIn, TReduced> {
        let result = seed;
        return this.per<TReduced>((emit, value) => {
            result = reducer(result, value);
            return emit(result);
        });
    }

    reduceWithoutSeed(reducer: (left: TOut, right: TOut) => TOut): Per<TIn, TOut> {
        let result: TOut;
        let started = false;
        return this.per<TOut>((emit, value) => {
            result = started ? reducer(result, value) : value;
            const complete = emit(result);
            started = true;
            return complete;
        });
    }

    reduce(reducer: (left: TOut, right: TOut) => TOut): Per<TIn, TOut>;
    reduce<TReduced>(reducer: (left: TReduced, right: TOut) => TReduced, seed: TReduced): Per<TIn, TReduced>;
    reduce<TReduced>(reducer: (left: any, right: TOut) => any, seed?: TReduced): Per<TIn, any> {
        return arguments.length === 2
            ? this.reduceWithSeed<TReduced>(reducer, seed)
            : this.reduceWithoutSeed(reducer as (left: TOut, right: TOut) => TOut);

    }

    /*  A passive observer - gathers results into the specified array, but
        otherwise has no effect on the stream of values
     */
    into(ar: TOut[], limit?: number) {
        if (!Array.isArray(ar)) {
            throw new Error("into expects an array");
        }
        limit = optionalLimit(limit);
        return this.listen(function(value) {
            if (limit <= 0) {
                return true;
            }
            ar.push(value);
            limit--;
        });
    }

    submit(value: TIn) {
        return this.forEach(ignore, value);
    }

    all(value?: TIn) {
        var results: TOut[] = [];
        this.into(results).submit(value);
        return results;
    }

    first(value?: TIn) {
        let first: TOut;

        this.listen(v => {
            first = v;
            return true;
        }).submit(value);

        return first;
    }

    last(value?: TIn) {
        let last: TOut;

        this.listen(v => {
            last = v;
            return false;
        }).submit(value);

        return last;
    }

    truthy() {
        return this.filter(truthy);
    }
}

function blank<T>(emit: Sink<T>, value: T) {
    emit(value);
}

export default function per<TIn, TOut>(valOrFunc: Init<TIn, TOut> | Per<TIn, TOut>, bindThis?: any): Per<TIn, TOut> {
    if (!valOrFunc || arguments.length === 0) {
        return new Per(blank);
    }
    if (valOrFunc instanceof Per) {
        return valOrFunc;
    } else {
        return new Per<TIn, TOut>(valOrFunc, bindThis);
    }
}

function optionalLimit(limit?: number) {
    return typeof limit != 'number' ? Number.MAX_VALUE : limit;
}

function ignore() {
    return false;
}

function truthy(value: any) {
    return !!value;
}
