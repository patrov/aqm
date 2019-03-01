/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * Make an object Observable
 */
define(["Kimo.Utils"], function(Utils) {
    var _registerEvents = function(events) {
        if ($.isArray(events)) {
            for (var event in events) {
                if (!(events[event] in this._eventsContainer)) {
                    this._eventsContainer[events[event]] = [];
                }
            }
        }
    }

    var Observable = {
        _eventsContainer: {},
        _useEvtCtn: true,
        on: function(eventName, callback) {
            eventName = (typeof eventName == "string") ? eventName : false;
            if (!eventName)
                return;
            if (typeof callback !== "function")
                throw "callback must be a function";
            if (!(eventName in this._eventsContainer) && this._useEvtCtn)
                return; //only trigger available events on strict mode
            if (!this._useEvtCtn) {
                this.registerEvents([eventName]);
            }

            this._eventsContainer[eventName].push(callback);
        },

        trigger: function(eventName) {
            if (eventName in this._eventsContainer) {
                for (var func in this._eventsContainer[eventName]) {
                    if (typeof this._eventsContainer[eventName][func] == "function") {
                        try {
                            var args = $.merge([],arguments);
                            args.shift();
                            this._eventsContainer[eventName][func].apply(this, args);
                        } catch (err) {
                            console.log(err);
                        }
                    }
                }
            }
        },

        registerEvents: function(events) {
            _registerEvents.call(this, events);
        },

        _registerEvents: function(events) {
            _registerEvents.call(this, events);
        },
                
        detach: function(eventName, callback) {
            if (eventName in this._eventsContainer) {
                if (!callbacks) {
                   this._eventsContainer[eventName] = []; 
                   return this;
                }
                var callbacks = this._eventsContainer[eventName];
                $.each(callbacks, function(i, func) {
                    if (func == callback) {
                        callbacks[i] = null;
                    }
                });
            }
            return this;
        }
    };

    /* make */
    Observable.extend = function(object, strict) {
        strict = strict || false; //default is loose
        var dataClone = $.extend(true, {}, Observable);
        if (strict) {
            dataClone._useEvtCtn = false;
        }
        delete(dataClone.extend);
        $.extend(object, dataClone);
        return object;
    }
    Kimo.Observable = Observable;
    return Observable;
});
