var per = require('./per');

var failed = 0;

var assert = function(expected, actual) {
    expected = JSON.stringify(expected);
    actual = JSON.stringify(actual);
    if (expected != actual) {
        console.error('Expected: ' + expected + ', actual: ' + actual);
        failed++;
    }
};

assert('hi', per.first('hi'));
assert([1, 2, 3], per.forEach().toArray([1, 2, 3]));
assert([2, 4, 6], per.forEach().map('*2').toArray([1, 2, 3]));
assert(12, per.forEach().map('*2').sum([1, 2, 3]));

if (failed === 0) {
    console.log("All good");
}
