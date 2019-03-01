/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

define([], function() {
    
    var DbManager = (function() {
        var _db = null;
        var _dbName = null;
        var _dbContainer = {};

        /*init*/
        var _init = function(dbName) {
            var data = _createOrRetrieveDb(dbName);
            var storageItem = _createStorage(data, dbName);
            _dbContainer[dbName] = storageItem;
            if (!localStorage)
                throw new Exception("localStorage can't be found");
            return storageItem;
        };

        var _updateLocalStorage = function(newStorage, dbName) {
            var dbName = dbName || "none";
            var dbToString = JSON.stringify(newStorage);
            localStorage.setItem(dbName, dbToString);
        };

        var _createOrRetrieveDb = function(dbName) {
            var result = false;
            var data = localStorage.getItem(dbName) || null;
            if (data) {
                result = _getLocalData(data);
            }
            if (!data) {
                result = localStorage.setItem(dbName, "{}");
                result = {};
            }
            return result;
        };

        var _getLocalData = function(dataString) {
            return JSON.parse(dataString);
        };

        var _getDb = function(dbName) {
            var dbName = dbName || false;
            if (!false)
                return _dbContainer[dbName];
        }

        var _deleteDb = function(list) {
            var dbName = list.name;
            //_dbContainer[listName] = false;
            localStorage.setItem(dbName, "{}");
        }

        var _createStorage = function(data, dbName) {
            var config = {};
            config.data = data;
            config.name = dbName;
            config.onChange = _updateLocalStorage;
            config.onDelete = _updateLocalStorage;
            config.onDestroy = _deleteDb;
            var cfStorage = new SmartList(config);
            return cfStorage;
        }
        
        return {
            init: _init,
            getDb: _getDb
        };
    })();
    
    /*
     *Simple data container with action events
     *events : [add,change,destroy]
     *
     **/
    var SmartList = function(config) {
        var config = config || {};
        this.name = config.name || "list_" + new Date().getTime();
        this.dataContainer = {};
        this.itemCount = 0;
        this.keyId = null;
        this.maxEntry = null;
        /*callbacks*/
        this.onChange = function() {
        };
        this.onDestroy = function() {
        };
        this.onInit = function() {
        };
        this.onAdd = function() {
        };
        this.onReplace = function() {
        };
        this.onDelete = function() {
        };

        if (typeof this.init !== "function") {
            this.init = function(config) {
                this.onChange = (typeof config.onChange == "function") ? config.onChange : this.onChange;
                this.onDestroy = (typeof config.onDestroy == "function") ? config.onDestroy : this.onDestroy;
                if (config.idKey)
                    this.keyId = config.idKey;
                this.onInit = (typeof config.onInit == "function") ? config.onInit : this.onInit;
                this.onAdd = (typeof config.onAdd == "function") ? config.onAdd : this.onAdd;
                this.onReplace = (typeof config.onReplace == "function") ? config.onReplace : this.onReplace;
                this.onDelete = (typeof config.onDelete == "function") ? config.onDelete : this.onDelete;
                if (config.maxEntry)
                    this.maxEntry = parseInt(config.maxEntry);
                var data = (config.data) ? config.data : {};
                if ($.isEmptyObject(data)) {
                    this.setData(data);
                }
                this.itemCount = this.getSize();
            }
        }

        SmartList.prototype.setMaxEntry = function(maxEntry) {
            maxEntry = (maxEntry) || null;
            this.maxEntry = maxEntry;
        }

        SmartList.prototype.set = function(key, value, silent) {
            silent = (typeof silent == "boolean") ? silent : false;
            var bound = this.itemCount + 1;
            if (this.maxEntry && (bound > this.maxEntry))
                return;
            this.dataContainer[key] = value;
            this.itemCount = this.itemCount + 1;
            if (!silent) {
                this.onChange.call(this, this.dataContainer, this.name, value);
            }
            //return this.dataContainer;
        }

        SmartList.prototype.get = function(key) {
            return this.dataContainer[key] || false;
        }

        SmartList.prototype.destroy = function() {
            this.dataContainer = {};
            var self = this;
            this.itemCount = 0;
            this.onDestroy.call(this, self);
        }

        SmartList.prototype.reset = function() {
            this.destroy();
        }

        SmartList.prototype.getData = function() {
            return this.dataContainer;
        }

        SmartList.prototype.toArray = function(clear) {
            var cleanData = [];
            if (clear) {
                $.each(this.dataContainer, function(key, item) {
                    cleanData.push(item);
                });
            } else {
                cleanData = $.makeArray(this.dataContainer);
            }
            return cleanData;
        }

        SmartList.prototype.replaceItem = function(item) {
            var mainKey = item[this.keyId];
            this.dataContainer[mainKey] = item;
            this.onReplace.call(this, this.dataContainer, this.name, item);
        }

        SmartList.prototype.updateItem = function(item) {
            this.replaceItem(item);
        }

        SmartList.prototype.deleteItem = function(item, silent) {
            var mainKey = item[this.keyId];
            delete(this.dataContainer[mainKey]);
            this.itemCount = this.itemCount - 1;
            if (!silent)
                this.onDelete.call(this, this.dataContainer, this.name, item);
        }


        SmartList.prototype.deleteItemById = function(id) {
            delete(this.dataContainer[id]);
            this.itemCount = this.itemCount - 1;
            this.onDelete.call(this, this.dataContainer, this.name);

        };

        SmartList.prototype.setData = function(data, keyId) {
            if (keyId)
                this.keyId = keyId;
            var self = this;
            if ($.isArray(data)) {
                $.each(data, function(i, item) {
                    var itemId = item[self.keyId];
                    if (!itemId && config.generateKey) {
                        itemId = Math.ceil(Math.random() * 999999) + "-" + Math.ceil(Math.random() * 999999);//to change
                        item[self.keyId] = itemId;
                    }
                    self.set(itemId, item, true);
                });
            } else {
                data = (data) ? data : {};
                this.dataContainer = data;
            }
            this.onInit.call(this, this.dataContainer);
            return this;
        }
        SmartList.prototype.addData = function(data, silent) {
            var self = this;
            silent = (typeof silent == "boolean") ? silent : false;
            var items = [];
            if ($.isArray(data)) {
                $.each(data, function(i, item) {
                    var itemId = item[self.keyId];
                    if (!itemId && config.generateKey) {
                        itemId = Math.ceil(Math.random() * 999999) + "-" + Math.ceil(Math.random() * 999999);//to change
                        item[self.keyId] = itemId;
                    }
                    self.set(itemId, item);
                    items.push(item);
                });
            } else {
                data = (data) ? data : {};
                this.dataContainer = $.extend(true, this.dataContainer, data);
            }
            if (!silent)
                this.onAdd.call(this, items);
        };


        SmartList.prototype.getSize = function() {
                var items = this.toArray(true);
                return items.length;
            };

            return this.init(config);
    }

    /*register*/
    Kimo.SmartList = SmartList;
    Kimo.DbManager = DbManager;
    
    return {
        SmartList: SmartList,
        DbManager: DbManager
    }
});
