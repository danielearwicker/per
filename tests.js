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
        console.log(actual);
    }
};

// Super minimal usage, push a single value - does nothing helpful:
var result;
per('hi').each(function(value) { result = value; });
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
assert([2, 4, 6], per([1, 2, 3]).map('*2').all());
assert([2, 4, 6], per([1, 2, 3]).map(function(x) { return x*2; }).all());

// Sum (built on reduce, note: emits all intermediate results, so use last)
assert(12, per([1, 2, 3]).map('*2').sum().last());
assert([2, 6, 12], per([1, 2, 3]).map('*2').sum().all());

// Truthy (built on filter, works just like JS Array's filter)
assert([4, 'str', true, {}], per([0 , 4, '', 'str', false, true, null, {}]).truthy().all());

// Again like JS Array:
assert(true, per([1, 'hi', {}]).every());
assert(false, per([1, '', {}]).every());
assert(true, per([1, 'hi', {}]).some());
assert(true, per([1, '', {}]).some());
assert(false, per([0, '', null]).some());

// Input can be a function that generates values
var odds = function(each) {
    for (var n = 1; n < 15; n+=2) {
        each(n);
    }
};

// Skip and take are examples of stateful operators
assert([7, 9, 11, 13], per(odds).skip(3).all());
assert([5, 7, 9], per(odds).skip(2).take(3).all());

// Custom operators - a stateless one:
var censor = function(each, value) {
    if (typeof value === 'string' && value.length <= 5) {
        each(value);
    } else {
        each('SORRY');
        each('REDACTED');
    }
};

// If pipeline begins with custom, can call per directly as a function to avoid saying per.per
assert(['This', 'array', 'only', 'SORRY', 'REDACTED', 'short', 'SORRY', 'REDACTED'],
   per(['This', 'array', 'only', 'contains', 'short', 'strings']).per(censor).all());

// Operators can be stateful - best to wrap them in a function to create fresh ones:
var indexes = function() {
    var counter = 0;
    return function(each, value) {
        each([counter++, value]);
    }
};
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(['first', 'second', 'third']).per(indexes()).all());

// Or reuse same instance to maintain state:
var i = indexes();
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(['first', 'second', 'third']).per(i).all());
assert([[3, 'first'], [4, 'second'], [5, 'third']], per(['first', 'second', 'third']).per(i).all());

// Operators can work like bind/select many because can call 'each' multiple times:
var dup = function(each, value) {
    each(value);
    each(value);
};

assert(['a', 'a', 'b', 'b', 'c', 'c'], per(['a', 'b', 'c']).per(dup).all());

// Order of composition can be important
assert([[0, 'a'], [1, 'a'], [2, 'b'], [3, 'b'], [4, 'c'], [5, 'c']],
    per(['a', 'b', 'c']).per(dup).per(indexes()).all());
assert([[0, 'a'], [0, 'a'], [1, 'b'], [1, 'b'], [2, 'c'], [2, 'c']],
    per(['a', 'b', 'c']).per(indexes()).per(dup).all());

// As shown with 'odds', input can be a generator function, but what if it's a pesky method on an object
// and hence needs a this reference?
function TestClass() {
    this.a = 'a';
    this.b = 'b';
    this.c = 'c';
}
TestClass.prototype.things = function(each) {
    // depends on this...
    each(this.a);
    each(this.b);
    each(this.c)
};

var testObj = new TestClass();
// Need to pass second parameter to per, to provide correct 'this'
assert(['a', 'b', 'c'], per(testObj.things, testObj).all());

if (failed === 0) {
    console.log('');
    console.log('All good');
}
