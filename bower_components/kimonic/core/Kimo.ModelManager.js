/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
define(["Kimo.Observable", "jquery"], function(Observable, jQuery) {

    var ModelManager = (function($) {
        this._init = function() {
        }
        var _repositoriesCtn = {};//Keep Repository's reference
        var _adapter = null;
        var _generateId = (function() {
            var compteur = 1;
            return function(prefix) {
                prefix = (typeof prefix === "string") ? prefix : false;
                var id = new Date().getTime() + "_" + compteur++;
                if (prefix)
                    id = prefix + "_" + id;
                return id;
            };
        }());


        var _getRepositoryInstance = function(repositoryName) {
            var repositoryName = (typeof repositoryName == "string") ? repositoryName : false;
            if (!repositoryName)
                return;
            return _repositoriesCtn[repositoryName];
        }

        var AbstractRepository = {
            changeHistory: {},
            onCreate: function() {
                var mixin = $.extend(true, {}, Observable);
                $.extend(this, mixin);
                this.entities = {};
                this.cidSidMap = {};
                this.model = null;
                this._registerEvents(["change", "save", "remove", "create"]);
            },
            findByCid: function(cid) {
                cid = (typeof cid === "string") ? cid : 0;
                return this.entities[cid];
            },
            getPath: function() {
                throw "getPath:NotImplementedYet";
            },
            findById: function(entityId) {
                var resPromise = null;
                var entity = this.entities[this.cidSidMap[entityId]];
                if (entity) {
                    var def = new $.Deferred();
                    resPromise = def.promise();
                    def.resolve(entity);
                }
                if (!entity) {
                    return this.find(entityId);
                }
                return resPromise;
            },
            findAll: function() {
                var results = [];
                for (var entity in this.entities) {
                    if (this.entities[entity] && this.entities[entity] !== "undefined") {
                        results.push(this.entities[entity]);
                    }
                }
                return results;
            },

            toJson: function() {
                var results = [];
                for(var entity in this.entities) {
                    results.push(this.entities[entity].toJson());
                }
                return results;
            },

            /*call is made via adapter*/
            get: function(index) {
                var compteur = 0;
                for (var entity in this.entities) {
                    if (compteur == index)
                        return this.entities[entity];
                    compteur++;
                }
            },
            /**
             *call is made via adapter
             *populate contents
             *n'ajouter que les entités qui diffèrent
             * isSync = false
             *
             **/
            getAll: function(options) {
                var def = new $.Deferred(),
                        self = this,
                        container = [],
                        data,
                        triggerEvent,
                        results;
                triggerEvent = options.triggerCreateEvent || false;
                _adapter.findAll(this.getName(), options).done(function(response) {
                    container = [];
                    results = response.result;
                    if (results) {
                        for (var resultKey in results) {
                            data = self.create(results[resultKey], triggerEvent, false);
                            container.push($.extend(true, {}, data));
                        }
                    }
                    def.resolve(container);
                });
                return def.promise();
            },
            _registerNewModel: function(modelData) {
                var data = new this.model(modelData);
                data._reftoRepository = this;
            },

            setData: function(data, updateData) {
                if (!updateData) {
                    this.reset();
                }
                var container = [],
                        resultKey,
                        entity,
                        triggerEvent = true;//this.options.triggerCreateEvent || false;
                if (data) {
                    for (resultKey in data) {
                        entity = this.create(data[resultKey], triggerEvent, false);
                        container.push($.extend(true, {}, entity));
                    }
                }
                return container;
            },
            find: function(entityId, callback) {
                var promise = _adapter.find(this.getName(), entityId);
                var self = this;
                var def = new $.Deferred();
                promise.done(function(response) {
                    var data = response.result;
                    var entity = self.create(data, false, false);
                    def.resolve(entity);
                });
                return def;
            },
            create: function(modelData, triggerEvents, persist) {
                triggerEvents = (typeof triggerEvents === "boolean") ? triggerEvents : true;
                persist = (typeof persist === "boolean") ? persist : true;
                if (typeof this.model !== "function") {
                    throw "EntityCantBeFoundError";
                }
                var data = new this.model(modelData);
                data._reftoRepository = this;
                if (triggerEvents)
                    this.trigger("change", "create", data);
                return this.add(data, false, persist);
            },

            removeByCid: function(cid) {
                var entity = this.entities[cid];
                if (!entity) { throw "EntityCantBeFoundError"; }

                return this.remove(entity);
            },
            remove: function(entity) {
                entity = this.entities[entity._cid];
                if (!entity) {
                    throw "EntityCantBeFoundError";
                }
                
                this.trigger("change", "remove", entity);

                /* delete on success only */
                delete(this.entities[entity._cid]);
                return _adapter.invoke("remove", entity, this.getName(), {});
            },

            getName: function() {
                prefix = (typeof this.prefix === 'string') ? this.prefix + ":" : "";
                return prefix + this.repositoryName;
            },

            update: function() {
                return this.add.apply(this, arguments);
            }, //take a look at entity save

            reset: function () {
                this.entities = {};
                this.cidSidMap = {};
            },

            add: function(content, triggerEvent, persist) {
                triggerEvent = (typeof triggerEvent == "boolean") ? triggerEvent : true;
                persist = (typeof persist == "boolean") ? persist : true;
                var isAnUpdate = (content._cid in this.entities) ? true : false;
                var changeReason = (isAnUpdate) ? "update" : "create";
                this.entities[content._cid] = content;
                this.cidSidMap[content.getUid()] = content._cid;
                if (typeof content._reftoRepository === "undefined") {
                    content._reftoRepository = this;
                }
                if (triggerEvent) {
                    this.trigger("change", changeReason, content);  //add event type
                }
                if (persist) {
                    return _adapter.invoke(changeReason, content, this.getName(), {}); //handle callbacks here
                }
            }

        };

        var _createRepository = function(userConfig) {
            var ModelManagerApi = this;
            if (!("repositoryName" in userConfig))
                throw "repositoryName must be set";
            if (typeof userConfig.repositoryName !== "string")
                throw "repositoryName must a string";
            var repositoryName = userConfig.repositoryName;
            var mockFunc = function(config) {
                this.onCreate();
                $.extend(this, userConfig, config);
                console.log("radical", this.getName());
                var instance = ModelManagerApi.getRepository(this.getName());
                if (!instance) {
                    this.id = _generateId("repository");
                    if (typeof this.init === "function") {
                        this.init();
                    }
                    _repositoriesCtn[this.getName()] = this;
                }
                else {
                    return instance;
                }

            }
            $.extend(mockFunc.prototype, AbstractRepository);
            //mockFunc.parent = AbstractRepository;
            return mockFunc;
        }


        /*Entity*/
        var AbstractEntity = {
            onCreate: function() {
                var mixin = $.extend(true, {}, Observable);
                $.extend(this, mixin);
                this._cid = _generateId();
                this._idKey = "uid"; //_idKey
                this.defaults = {};
                this._settings = {};
                this._changed = {};
                this.isDirty = false;
                this._registerEvents(["change", "save", "delete"]);
            },
            init: function() {
            },
            getPath: function() {
                throw "getPathMethod:NotImplementedYet";
            },
            checkData: function() {
                console.log("checkData must be implemented for [" + this.name + "] entity");
                return false;
            },
            get: function(key) {
                if (key in this._settings) {
                    return this._settings[key];
                } else {
                    return false;
                }
            },
            getCid: function() {
                return this._cid;
            },
            /**
             * entity hasChanged
             **/
            hasChanged: function() {
                return this.isDirty;
            },
            isNew: function() {
                return (this.getUid()) ? false : true;
            },
            getUid: function() {
                return this[this._idKey];
            },
            setUid: function(uid) {
                this[this._idKey] = uid;
                this._settings[this._idKey] = uid;
                this.trigger("change", "update", this, {
                    uid: this[this._idKey]
                });
            },
            set: function(key, value, silent) {
                silent = (typeof silent == "boolean") ? silent : false;
                var changed = {};
                if (typeof arguments[0] == "object") { 
                    silent = arguments[1];
                    var settings = key;
                    for (var key in settings) {
                        if (key in this._settings) {
                            if (this._settings[key] == settings[key])
                                continue;
                            this._settings[key] = settings[key];
                            this.isDirty = true;
                            changed[key] = settings[key];
                        }
                    }

                    if ("_cid" in settings) {
                        this._cid = settings["_cid"];
                    }

                    if (this._idKey in settings) {
                        this[this._idKey] = settings[this._idKey];
                    }

                    if (!silent) {
                        this.trigger("change", "update", this, changed);
                    }
                    if (typeof this._reftoRepository == "object") {
                        this._reftoRepository.trigger("change", "update", this, changed);
                    }
                    return;
                }
                if (this._settings[key] == value)
                    return;
                if ((key in this._settings)) {
                    this._settings[key] = value;
                    this.isDirty = true;
                    changed[key] = value;
                    if (!silent) {
                        this.trigger("change", "update", this, changed);
                    }
                    if (typeof this._reftoRepository == "object") {
                        this._reftoRepository.trigger("change", "update", this, changed);
                    }
                } else {
                    throw "Key " + key + " doesn't exists in Entity " + this.name;
                }
            },
            "super": function() {
                var baseApi = {};
                baseApi.toJson = Kimo.jquery.proxy(AbstractEntity.toJson, this);
                return baseApi;
            },
            toJson: function() {
                /*recursive toJson */
                var json = $.extend(true, {}, this._settings);
                json["__entity__"] = this.name;
                /*handle uid*/
                if (!this.isNew()) {
                    json.uid = this.uid;
                }
                /*hander subContent*/
                for (var prop in json) {
                    var value = json[prop];
                    if (value && value.constructor.name == "Entity") {
                        json[prop] = value.toJson();
                    }
                }
                return json;
            },
            save: function() { //must return promise
                //trigger sync?
                var self = this;
                var handlers = {
                    success: function(response) {
                        self.trigger("save", this);
                    },
                    error: function() {
                    }
                }
                return _adapter.invoke("update", this, this.name, handlers); // move to persist return promise
            },
			
            remove: function() {
                var self = this;
                var handlers = {
                    success: function() {
                        delete self;
                        self.trigger("remove");
                    },
                    error: function() {
                        self.trigger("remove");
                    }
                };
                /*trigger event */
                return _adapter.invoke("remove", this, this.name, handlers);
            }
        };

        var _ucfirst = function(str) {
            var firstLetter = str.substr(0, 1);
            return firstLetter.toUpperCase() + str.substr(1);
        }

        var _createGetters = function(userConfig, obj) {
            if (typeof userConfig != "object")
                return false;
            var container = {};
            for (var property in userConfig) {
                if (typeof property == "string") {
                    var f = (function(cprop) {
                        return function() {
                            return this._settings[cprop];
                        }
                    })(property);
                    var funcName = "get" + _ucfirst(property);
                    container[funcName] = f;
                }
                $.extend(obj, container);
            }
        }

        var _createEntity = function(userConfig) {

            var mock = function Entity(instanceParams) {
                /*clean mandatory params or functions here*/
                this.onCreate();
                $.extend(true, this, $.extend({}, userConfig)); //defaults go to defaults
                if (typeof this.name != "string")
                    throw("Entity must have a name");
                var defaultsCopy = $.extend({}, this.defaults);
                if (typeof instanceParams == "object") {
                    this._settings = $.extend(true, {}, defaultsCopy, instanceParams);
                } else {
                    this._settings = defaultsCopy;
                }

                if ("_cid" in this._settings) {
                    this._cid = this._settings._cid;
                }

                if (this._idKey in this._settings) {
                    this[this._idKey] = this._settings[this._idKey];
                }
                _createGetters($.extend(true, {}, this._settings), this);
                this.init();
            }

            $.extend(true, mock.prototype, AbstractEntity);
            return mock;
        }

        var _useAdapter = function(adapter) {
            if (adapter) {
                _adapter = adapter;
            }
        }

        return{
            createRepository: _createRepository,
            createEntity: _createEntity,
            getRepository: _getRepositoryInstance,
            useAdapter: _useAdapter
        }
    })(jQuery, window);
    Kimo.ModelManager = ModelManager;
    return ModelManager;
});