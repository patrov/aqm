define([], function() {
    var api = (function() {

        var ParamsContainer = function() {
            return ParamsContainer.getInstance();
        }

        ParamsContainer.getInstance = function() {
            var _paramsContainer = {};
            this.instance = null;

            this.getInstance = function() {
                if (this.instance == null) {
                    this.instance = _createInstance.call(this);
                }
                return this.instance;
            }
            var _createInstance = function() {
                return {
                    get: _get,
                    set: _set
                }
            }

            var _set = function(key, value) {
                key = (typeof key == "string") ? key : false;
                if (!key)
                    throw new Error("set key can't be null")
                _paramsContainer[key] = value;
            }
            var _get = function(key) {
                key = (typeof key == "string") ? key : false;
                if (!key)
                    throw new Error("get key can't be null");
                return _paramsContainer[key];
            }
            return this.getInstance();
        }
        return new ParamsContainer;
    })()
    Kimo.ParamsContainer = api;
    return api;
});

