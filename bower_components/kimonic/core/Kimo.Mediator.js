/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

define(['Kimo.Observable'], function (Observable) {




});

var Mediator = (function (){
    var publish = function () {},
        subscribe = function () {},

        /* the idea:
         * if a subscriber come after
         *
         * */
        permanentSubscribe = function () {},

        api = {
            publish: publish,
            subscribe :subscribe,
            permanentSubscribe:permanentSubscribe
        };
  return api;
}());