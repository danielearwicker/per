
function toFunc(valOrFunc, bindThis) {
    if (typeof valOrFunc !== 'function') {
        return Array.isArray(valOrFunc)
            ? function(emit) {
                return valOrFunc.some(emit);
            } : function(emit) {
                return emit(valOrFunc);
            };
    }
    if (bindThis) {
        return function(emit, value) {
            valOrFunc.call(bindThis, emit, value);
        }
    }
    return valOrFunc;
}

function Per(valOrFunc, bindThis) {
    this.forEach = toFunc(valOrFunc, bindThis);
}

function create(valOrFunc, bindThis) {
    if (valOrFunc && valOrFunc instanceof Per) {
        return valOrFunc;
    }
    return new Per(valOrFunc, bindThis)
}

Per.prototype.per = function(valOrFunc, bindThis) {
    var first = this.forEach;
    var second = toFunc(valOrFunc && valOrFunc.forEach || valOrFunc, bindThis);
    return create(function(emit, value) {
        return first(function(firstVal) {
            return second(emit, firstVal);
        }, value);
    });
};

function lambda(expression) {
    return new Function('x', 'return ' + expression);
}

Per.prototype.map = function(mapFunc) {
    if (typeof mapFunc === 'string') {
        mapFunc = lambda(mapFunc);
    }
    return this.per(function(emit, value) {
        return emit(mapFunc(value));
    });
};

Per.prototype.filter = function(predicate) {
    return this.per(function(emit, value) {
        if (predicate(value)) {
            return emit(value);
        }
    });
};

Per.prototype.skip = function(count) {
    return this.per(function(emit, value) {
        if (count > 0) {
            count--;
            return false;
        }
        return emit(value);
    });
};

Per.prototype.take = function(count) {
    return this.per(function(emit, value) {
        if (count <= 0) {
            return true;
        }
        count--;
        return emit(value);
    });
};

Per.prototype.until = function(untilFunc) {
    return this.per(function(emit, value) {
        if (untilFunc(value)) {
            return true;
        }
        return emit(value);
    });
};

Per.prototype.flatten = function() {
    return this.per(function(emit, array) {
        return !Array.isArray(array)
            ? emit(array)
            : array.some(function(value) {
                return emit(value);
            });
    });
};

Per.prototype.reduce = function(reducer, seed) {
    var result = seed, started = arguments.length == 2;
    return this.per(function(emit, value) {
        result = started ? reducer(result, value) : value;
        if (started) {
            emit(result);
        } else {
            started = true;
        }
    });
};

Per.prototype.all = function() {
    var results = [];
    this.forEach(function(value) {
        results.push(value);
    });
    return results;
};

Per.prototype.first = function() {
    var result, got;
    this.forEach(function(value) {
        if (!got) {
            result = value;
            got = true;
        }
        return true;
    });
    return result;
};

Per.prototype.last = function() {
    var result;
    this.forEach(function(value) {
        result = value;
    });
    return result;
};

function truthy(value) { return !!value; }
Per.prototype.truthy = function() { return this.filter(truthy); };

function sum(l, r) { return l + r }
Per.prototype.sum = function() { return this.reduce(sum, 0); };

function and(l, r) { return !!(l && r) }
Per.prototype.and = function() { return this.reduce(and, true); };

function or(l, r) { return !!(l || r) }
Per.prototype.or = function() { return this.reduce(or, false); };

function not(v) { return !v }
Per.prototype.not = function() { return this.map(not); };

module.exports = create;
