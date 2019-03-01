/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

define([], function (){
    /*** iterator ***/
    var Iterator = function (data) {

        this.data = data;
        this.cursor = 0;

        if (this.hasNext !== "function") {
            Iterator.prototype.hasNext = function () {
                return this.data.length > this.cursor;
            }
        }

        Iterator.prototype.next = function () {
            var data = this.data[this.cursor];
            this.cursor = this.cursor + 1;
            return data;
        }

        Iterator.prototype.rewind = function () {
            this.cursor = 0;
        }

        Iterator.prototype.current = function () {
            return this.data[this.cursor];
        }
    };

    return {
        create : function (collection) {
            if (Array.isArray(collection)) {
                return new Iterator(collection);
            }
            throw "IteratorException: collection should be an array.";
        }
    }

});

