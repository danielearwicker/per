module.exports = (function() {

    var prototype = {};

    function create(func) {
        return Object.create(prototype, {
            func: { value: func }
        });
    }

    prototype.per = function(next) {
        var first = this.func;
        var second = (next && next.func) || next;
        return !second ? this : !first
            ? (next.func ? next : create(next))
            : create(function(value, each) {
                return first(value, function(firstVal) {
                    return second(firstVal, each);
                });
            });
    };

    function lambda(expression) {
        return new Function('_', 'return _' + expression);
    }

    prototype.map = function(mapFunc) {
        if (typeof mapFunc === 'string') {
            mapFunc = lambda(mapFunc);
        }
        return this.per(function(value, each) {
            return each(mapFunc(value));
        });
    };

    prototype.filter = function(predicate) {
        return this.per(function(value, each) {
            if (predicate(value)) {
                return each(value);
            }
        });
    };

    prototype.truthy = function() {
        return this.filter(function(value) {
            return !!value;
        });
    };

    prototype.skip = function(count) {
        return this.per(function(value, each) {
            if (count > 0) {
                count--;
                return false;
            }
            return each(value);
        });
    };

    prototype.take = function(count) {
        return this.per(function(value, each) {
            if (count <= 0) {
                return true;
            }
            count--;
            return each(value);
        });
    };

    prototype.until = function(untilFunc) {
        return this.per(function(value, each) {
            if (untilFunc(value)) {
                return true;
            }
            return each(value);
        });
    };

    prototype.forEach = function() {
        return this.per(function(array, each) {
            return !Array.isArray(array)
                ? each(value)
                : array.some(function(value) {
                    return each(value);
                });
        });
    };

    prototype.push = function(value, each) {
        if (this.func) {
            this.func(value, each);
        } else {
            each(value);
        }
    };

    prototype.read = function(input, each, inputThis) {
        var self = this;
        if (typeof input === 'function') {
            input.call(inputThis, function(value) {
                self.push(value, each);
            });
        } else {
            if (Array.isArray(input)) {
                input.forEach(function(value) {
                    self.push(value, each);
                });
            } else {
                self.push(input, each);
            }
        }
    };

    prototype.reduce = function(input, reducer, seed, inputThis) {
        var result = seed, started = arguments.length == 2;
        this.read(input, function(value) {
            result = started ? reducer(result, value) : value;
            started = true;
        }, inputThis);
        return result;
    };

    prototype.sum = function(input, inputThis) {
        return this.reduce(input, function(l, r) { return l + r }, 0, inputThis);
    };

    prototype.toArray = function(input, inputThis) {
        var results = [];
        this.read(input, function(value) {
            results.push(value);
        }, inputThis);
        return results;
    };

    prototype.first = function(input, inputThis) {
        var result, got;
        this.read(input, function(value) {
            if (!got) {
                result = value;
                got = true;
            }
            return true;
        }, inputThis);
        return result;
    };

    prototype.last = function(input, inputThis) {
        var result;
        this.read(input, function(value) {
            result = value;
        }, inputThis);
        return result;
    };

    prototype.some = function(input, inputThis) {
        var result = false;
        this.read(input, function(value) {
            if (value) {
                result = true;
                return true;
            }
        }, inputThis);
        return result;
    };

    prototype.every = function(input, inputThis) {
        var result = true;
        this.read(input, function(value) {
            if (!value) {
                result = false;
                return true;
            }
        }, inputThis);
        return result;
    };

    var singleton = create();
    Object.keys(prototype).forEach(function(key) {
        create[key] = function() {
            return prototype[key].apply(singleton, arguments);
        }
    });

    return create;
})();
