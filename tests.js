var per = require('./per');

var failed = 0;

var assert = function(expected, actual) {
    expected = JSON.stringify(expected);
    actual = JSON.stringify(actual);
    if (expected != actual) {
        console.error('Expected: ' + expected + ', actual: ' + actual);
        failed++;
    } else {
        console.log(actual);
    }
};

assert('hi', per.first('hi'));
assert([1, 2, 3], per.forEach().toArray([1, 2, 3]));
assert([2, 4, 6], per.forEach().map('*2').toArray([1, 2, 3]));
assert(12, per.forEach().map('*2').sum([1, 2, 3]));

function TestClass() {
    this.a = 'a';
    this.b = 'b';
    this.c = 'c';
}
TestClass.prototype.things = function(each) {
    each(this.a);
    each(this.b);
    each(this.c)
};

var testObj = new TestClass();
assert(['a', 'b', 'c'], per.toArray(testObj.things, testObj));

if (failed === 0) {
    console.log("All good");
}
