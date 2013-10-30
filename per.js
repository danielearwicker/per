module.exports = (function() {

    var prototype = {};

    function create(func, thisRef) {
        if (func && func.each) {
            return func;
        }
        if (typeof func !== 'function') {
            var value = func;
            func = Array.isArray(func)
                ? function(emit) {
                return value.some(emit);
            } : function(emit) {
                return emit(value);
            };
        } else if (thisRef) {
            var realFunc = func;
            func = function(emit, value) {
                realFunc.call(thisRef, emit, value);
            }
        }
        return Object.create(prototype, {
            each: { value: func }
        });
    }

    prototype.per = function(next, thisRef) {
        var first = this.each;
        var second = create(next, thisRef).each;
        return create(function(emit, value) {
            return first(function(firstVal) {
                return second(emit, firstVal);
            }, value);
        });
    };

    function lambda(expression) {
        return new Function('_', 'return _' + expression);
    }

    prototype.map = function(mapFunc) {
        if (typeof mapFunc === 'string') {
            mapFunc = lambda(mapFunc);
        }
        return this.per(function(emit, value) {
            return emit(mapFunc(value));
        });
    };

    prototype.filter = function(predicate) {
        return this.per(function(emit, value) {
            if (predicate(value)) {
                return emit(value);
            }
        });
    };

    prototype.truthy = function() {
        return this.filter(function(value) {
            return !!value;
        });
    };

    prototype.skip = function(count) {
        return this.per(function(emit, value) {
            if (count > 0) {
                count--;
                return false;
            }
            return emit(value);
        });
    };

    prototype.take = function(count) {
        return this.per(function(emit, value) {
            if (count <= 0) {
                return true;
            }
            count--;
            return emit(value);
        });
    };

    prototype.until = function(untilFunc) {
        return this.per(function(emit, value) {
            if (untilFunc(value)) {
                return true;
            }
            return emit(value);
        });
    };

    prototype.forEach = function() {
        return this.per(function(array, emit) {
            return !Array.isArray(array)
                ? emit(value)
                : array.some(function(value) {
                    return emit(value);
                });
        });
    };

    prototype.reduce = function(reducer, seed) {
        var result = seed, started = arguments.length == 2;
        return this.per(function(emit, value) {
            result = started ? reducer(result, value) : value;
            started = true;
            emit(result);
        });
    };

    prototype.sum = function() {
        return this.reduce(function(l, r) { return l + r });
    };

    prototype.all = function() {
        var results = [];
        this.each(function(value) {
            results.push(value);
        });
        return results;
    };

    prototype.first = function() {
        var result, got;
        this.each(function(value) {
            if (!got) {
                result = value;
                got = true;
            }
            return true;
        });
        return result;
    };

    prototype.last = function() {
        var result;
        this.each(function(value) {
            result = value;
        });
        return result;
    };

    prototype.some = function() {
        var result = false;
        this.each(function(value) {
            if (value) {
                result = true;
                return true;
            }
        });
        return result;
    };

    prototype.every = function() {
        var result = true;
        this.each(function(value) {
            if (!value) {
                result = false;
                return true;
            }
        });
        return result;
    };

    return create;
})();
