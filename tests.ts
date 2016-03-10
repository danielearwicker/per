import per, { Sink } from "./per";

declare module process {
    export let exitCode: number;
}

var failed = 0;

function assert<T>(expected: T, actual: T) {
    const expectedStr = JSON.stringify(expected);
    const actualStr = JSON.stringify(actual);
    if (expectedStr != actualStr) {
        console.error('');
        console.error('============= ERROR =============');
        console.error('');
        console.error('Expected: ' + expectedStr);
        console.error('  Actual: ' + actualStr);
        console.error('');
        failed++;
    } else {
        console.log('    Good: ' + actualStr);
    }
};

// Super minimal usage, push a single value - does nothing helpful:
let result: string;
per('hi').forEach(value => { result = value; });
assert('hi', result);

// Slightly more helpful, grab first output as return value:
assert('hi', per('hi').first());

// If input is array, we automatically "forEach" it
assert('hi', per(['hi', 'oh', 'bye']).first());
assert('bye', per(['hi', 'oh', 'bye']).last());

// If input is not an array, we submit it as the only input
assert(5, per(5).last());

// If we need to pass an array as a single input, wrap it in []:
assert([1, 2, 3], per<void, number[]>([[1, 2, 3]]).first());

// Collect results in an array
assert([1, 2, 3], per([1, 2, 3]).all());

// Map
assert([2, 4, 6], per([1, 2, 3]).map(x => x*2).all());
assert(["1", "2", "3"], per([1, 2, 3]).map(x => x + "").all());

// Reduce emits values by combining pairs of inputs
var concat = (left: string, right: string) => left + ' ' + right;

// Changed in 0.1.7 - one input, one output (more consistent/intuitive/useful)
assert(['hi'], per('hi').reduce(concat).all());

assert(['hi', 'hi ho'], per(['hi', 'ho']).reduce(concat).all());
assert(['hi', 'hi ho', 'hi ho silver'],
   per(['hi', 'ho', 'silver']).reduce(concat).all());

// Truthy (built on filter, works just like JS Array's filter)
assert([4, 'str', true, {}], per([0 , 4, '', 'str', false, true, null, {}]).truthy().all());

// Input can be a function that generates values
function odds(emit: Sink<number>) {
    for (let n = 1; n < 15; n+=2) {
        emit(n);
    }
};

// Skip and take are examples of stateful operators
assert([7, 9, 11, 13], per(odds).skip(3).all());
assert([5, 7, 9], per(odds).skip(2).take(3).all());

// Custom operators - a stateless one:
function censor(emit: Sink<string>, value: string) {
    if (typeof value === 'string' && value.length <= 5) {
        emit(value);
    } else {
        emit('SORRY');
        emit('REDACTED');
    }
};

// If pipeline begins with custom, can call per directly as a function to avoid saying per.per
assert(['This', 'array', 'only', 'SORRY', 'REDACTED', 'short', 'SORRY', 'REDACTED'],
   per(['This', 'array', 'only', 'contains', 'short', 'strings']).per(censor).all());

// Operators can be stateful - best to wrap them in a function to create fresh ones:
function indexes() {
    var counter = 0;
    return (emit: Sink<[number, string]>, value: string) => {
        emit([counter++, value]);
    }
};
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(['first', 'second', 'third']).per(indexes()).all());

// Or reuse same instance to maintain state:
var i = indexes();
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(['first', 'second', 'third']).per(i).all());
assert([[3, 'first'], [4, 'second'], [5, 'third']], per(['first', 'second', 'third']).per(i).all());

// Operators can work like bind/SelectMany because can emit multiple times:
function dup<T>(emit: Sink<T>, value: T) {
    emit(value);
    emit(value);
};

assert(['a', 'a', 'b', 'b', 'c', 'c'], per(['a', 'b', 'c']).per(dup).all());

// Order of composition can be important
assert([[0, 'a'], [1, 'a'], [2, 'b'], [3, 'b'], [4, 'c'], [5, 'c']],
    per(['a', 'b', 'c']).per(dup).per(indexes()).all());
assert([[0, 'a'], [0, 'a'], [1, 'b'], [1, 'b'], [2, 'c'], [2, 'c']],
    per(['a', 'b', 'c']).per(indexes()).per(dup).all());

// As shown with 'odds', input can be a generator function, but what if it's a pesky
// method on an object and hence needs a this reference?
class TestClass {
    a = 'a';
    b = 'b';
    c = 'c';

    things(emit: Sink<string>) {
        // depends on this...
        emit(this.a);
        emit(this.b);
        emit(this.c);
    }
}

var testObj = new TestClass();
// Need to pass second parameter to per, to provide correct 'this'
assert(['a', 'b', 'c'], per(testObj.things, testObj).all());

assert([4, 2], per(4).concat(2).all());
assert([4, 2, 1], per(4).concat([2, 1]).all());
assert([4, 2, 1], per(4).concat(function(emit) { emit(2); emit(1); }).all());
assert([4, 2, 1, 6], per(4).concat(per([2, 1, 6])).all());
assert([4, 2, 1, 6, 5], per(4).concat(per([2, 1, 6])).concat(function(emit) { emit(5); }).all());
assert([4, 2, 1, 6, 5, 3, 9], per(4).concat(per([2, 1, 6])).concat(function(emit) { emit(5); }).concat([3, 9]).all());

if (failed === 0) {
    console.log('');
    console.log('All good');
}

process.exitCode = failed;
