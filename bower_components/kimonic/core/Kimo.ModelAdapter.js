/*Adapters container*/
define([], function() {
    var AdapterRegistry = (function() {
        var _instance = null;

        var AdapterContainer = function() {
            this.adapters = {};
        }

        AdapterContainer.prototype.register = function(adapterName, adapter) {
            if (typeof adapterName != "string")
                throw new Error("adapterRegistry:register <br/> an adapterName must be provided!");
            this.adapters[adapterName] = adapter;
        }

        AdapterContainer.prototype.get = function(adapterName) {
            if (typeof adapterName != "string")
                throw new Error("adapterRegistry:get <br/> an adapterName must be provided!");
            return this.adapters[adapterName];
        }

        var _getAdapter = function() {
            if (!_instance) {
                _instance = new AdapterContainer();
            }
            return _instance;
        }
        return _getAdapter();
    })();
    
    Kimo.AdapterRegistry = AdapterRegistry;
    return AdapterRegistry;
})

