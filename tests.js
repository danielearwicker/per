var per = require('./per');

var failed = 0;

var assert = function(expected, actual) {
    expected = JSON.stringify(expected);
    actual = JSON.stringify(actual);
    if (expected != actual) {
        console.error('');
        console.error('============= ERROR =============');
        console.error('');
        console.error('Expected: ' + expected);
        console.error('  Actual: ' + actual);
        console.error('');
        failed++;
    } else {
        console.log('    Good: ' + actual);
    }
};

// Super minimal usage, push a single value - does nothing helpful:
var result;
per('hi').forEach(function(value) { result = value; });
assert('hi', result);

// Slightly more helpful, grab first output as return value:
assert('hi', per('hi').first());

// If input is array, we automatically "forEach" it
assert('hi', per(['hi', 'oh', 'bye']).first());
assert('bye', per(['hi', 'oh', 'bye']).last());

// If input is not an array, we submit it as the only input
assert(5, per(5).last());

// If we need to pass an array as a single input, wrap it in []:
assert([1, 2, 3], per([[1, 2, 3]]).first());

// Collect results in an array
assert([1, 2, 3], per([1, 2, 3]).all());

// Map (can accept a string expression suffix or a function)
assert([2, 4, 6], per([1, 2, 3]).map('x*2').all());
assert([2, 4, 6], per([1, 2, 3]).map(function(x) { return x*2; }).all());

// Not (built on map)
assert([false, true, true, false, true, false],
    per([true, false, '', 5, null, []]).not().all())

// Reduce emits values by combining pairs of inputs
var concat = function(left, right) { return left + ' ' + right; }

// Changed in 0.1.7 - one input, one output (more consistent/intuitive/useful)
assert(['hi'], per('hi').reduce(concat).all());

assert(['hi', 'hi ho'], per(['hi', 'ho']).reduce(concat).all());
assert(['hi', 'hi ho', 'hi ho silver'],
   per(['hi', 'ho', 'silver']).reduce(concat).all());

// Sum (built on reduce)
assert([2, 6, 12], per([1, 2, 3]).map('x*2').sum().all());
// Use last to get final outcome
assert(12, per([1, 2, 3]).map('x*2').sum().last());

// Truthy (built on filter, works just like JS Array's filter)
assert([4, 'str', true, {}], per([0 , 4, '', 'str', false, true, null, {}]).truthy().all());

// More built-in reducers
assert([true, true, true], per([1, 'hi', {}]).and().all());
assert([true, false, false], per([1, '', {}]).and().all());
assert([true, true, true], per([1, 'hi', {}]).or().all());
assert([false, true, true], per([0, 'hi', null]).or().all());
assert([false, false, false], per([0, '', null]).or().all());

// Input can be a function that generates values
var odds = function(emit) {
    for (var n = 1; n < 15; n+=2) {
        emit(n);
    }
};

// Skip and take are examples of stateful operators
assert([7, 9, 11, 13], per(odds).skip(3).all());
assert([5, 7, 9], per(odds).skip(2).take(3).all());

// Custom operators - a stateless one:
var censor = function(emit, value) {
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
var indexes = function() {
    var counter = 0;
    return function(emit, value) {
        emit([counter++, value]);
    }
};
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(['first', 'second', 'third']).per(indexes()).all());

// Or reuse same instance to maintain state:
var i = indexes();
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(['first', 'second', 'third']).per(i).all());
assert([[3, 'first'], [4, 'second'], [5, 'third']], per(['first', 'second', 'third']).per(i).all());

// Operators can work like bind/SelectMany because can emit multiple times:
var dup = function(emit, value) {
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
function TestClass() {
    this.a = 'a';
    this.b = 'b';
    this.c = 'c';
}
TestClass.prototype.things = function(emit) {
    // depends on this...
    emit(this.a);
    emit(this.b);
    emit(this.c);
};

var testObj = new TestClass();
// Need to pass second parameter to per, to provide correct 'this'
assert(['a', 'b', 'c'], per(testObj.things, testObj).all());

// Flatten array of arrays
assert([1, 2, 3, 4, 5, 6], per([[1], [2,3,4], [5,6]]).flatten().all());

// multicasting
var numbers = per(function(emit) {
    for (var n = 0; n < 100; n++) {
        emit(n);
    }
});

assert(0, numbers.first());

var evenResults = [], oddResults = [];

var split = numbers.multicast(
    per().filter('!(x%2)').take(72).into(evenResults),
    per().filter('x%2').take(68).into(oddResults)
);

split.submit(); // causes numbers to be sent
assert([0, 2, 4, 6], evenResults.slice(0, 4));
assert([1, 3, 5, 7], oddResults.slice(0, 4));

assert([0, 1, 2, 3, 4], split.all().slice(0, 5));
    // causes numbers to be sent again AND captures
    // multicast passthrough

// NB our 'into' bindings are still present, so have captured 2nd set of results
// but we used take() to limit array lengths, so neither has all 100 results
assert(72, evenResults.length);
assert(68, oddResults.length);

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
