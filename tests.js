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
per.push('hi', function(value) { result = value; });
assert('hi', result);

// Slightly more helpful, grab first output as return value:
assert('hi', per.first('hi'));

// If input is array, we automatically "forEach" it
assert('hi', per.first(['hi', 'oh', 'bye']));
assert('bye', per.last(['hi', 'oh', 'bye']));

// If input is not an array, we submit it as the only input
assert(5, per.last(5));

// If we need to pass an array as a single input, wrap it in []:
assert([1, 2, 3], per.first([[1, 2, 3]]));

// Collect results in an array
assert([1, 2, 3], per.toArray([1, 2, 3]));

// Map (can accept a string expression suffix or a function)
assert([2, 4, 6], per.map('*2').toArray([1, 2, 3]));
assert([2, 4, 6], per.map(function(x) { return x*2; }).toArray([1, 2, 3]));

// Sum (built on reduce, works just like JS Array's reduce)
assert(12, per.map('*2').sum([1, 2, 3]));

// Truthy (built on filter, works just like JS Array's filter)
assert([4, 'str', true, {}], per.truthy().toArray([0 , 4, '', 'str', false, true, null, {}]));

// Again like JS Array:
assert(true, per.every([1, 'hi', {}]));
assert(false, per.every([1, '', {}]));
assert(true, per.some([1, 'hi', {}]));
assert(true, per.some([1, '', {}]));
assert(false, per.some([0, '', null]));

// Input can be a function that generates values
var odds = function(each) {
    for (var n = 1; n < 15; n+=2) {
        each(n);
    }
};

// Skip and take are examples of stateful operators
assert([7, 9, 11, 13], per.skip(3).toArray(odds));
assert([5, 7, 9], per.skip(2).take(3).toArray(odds));

// Custom operators - a stateless one:
var censor = function(value, each) {
    if (typeof value === 'string' && value.length <= 5) {
        each(value);
    } else {
        each('SORRY');
        each('REDACTED');
    }
};

// If pipeline begins with custom, can call per directly as a function to avoid saying per.per
assert(['This', 'array', 'only', 'SORRY', 'REDACTED', 'short', 'SORRY', 'REDACTED'],
    per(censor).toArray(['This', 'array', 'only', 'contains', 'short', 'strings']));

// Operators can be stateful - best to wrap them in a function to create fresh ones:
var indexes = function() {
    var counter = 0;
    return function(value, each) {
        each([counter++, value]);
    }
};
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(indexes()).toArray(['first', 'second', 'third']));

// Or reuse same instance to maintain state:
var i = indexes();
assert([[0, 'first'], [1, 'second'], [2, 'third']], per(i).toArray(['first', 'second', 'third']));
assert([[3, 'first'], [4, 'second'], [5, 'third']], per(i).toArray(['first', 'second', 'third']));

// Operators can work like bind/select many because can call 'each' multiple times:
var dup = function(value, each) {
    each(value);
    each(value);
};

assert(['a', 'a', 'b', 'b', 'c', 'c'], per(dup).toArray(['a', 'b', 'c']));

// Order of composition can be important
assert([[0, 'a'], [1, 'a'], [2, 'b'], [3, 'b'], [4, 'c'], [5, 'c']], per(dup).per(indexes()).toArray(['a', 'b', 'c']));
assert([[0, 'a'], [0, 'a'], [1, 'b'], [1, 'b'], [2, 'c'], [2, 'c']], per(indexes()).per(dup).toArray(['a', 'b', 'c']));

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
// Fortunately all the relevant per methods take an optional last parameter for this purpose:
assert(['a', 'b', 'c'], per.toArray(testObj.things, testObj));

if (failed === 0) {
    console.log('');
    console.log('All good');
}
