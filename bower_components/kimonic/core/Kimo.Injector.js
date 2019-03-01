String.prototype.replaceAt = function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}
var  test =  function t () {
  alert("rest");
}

var testString = test.toString();
console.log(testString);

var test2 = '('+testString.replaceAt(testString.length-1, "alert(1); }());");
eval(test2);

