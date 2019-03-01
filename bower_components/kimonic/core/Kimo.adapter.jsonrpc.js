define(["Kimo.ModelAdapter"], function(AdapterRegistry) {
   
    var jsonRpcAdapter = {
        settings: {
            availableActions: ["create", "read", "update", "remove"],
            ws: "ws_data"
        },
        invoke: function(action, model, repository, callbacks, params) {
            if (this.settings.availableActions[action] == "undefined")
                return false;
            if (typeof repository != "string")
                return false;
            var promise = this[action].call(this, model, repository, callbacks, params);
            return promise;
        },
        create: function(model, repository, callbacks) {
            var data = {
                appkey: "6s5dq4f68qzdf7sd", //must come from application
                model: model.name,
                data: model.toJson(true)
            };
            return makeRequest(this.settings.ws + ".create", {
                params: data,
                success: function(response) {
                    model.setUid(response.result.uid);
                    if (typeof callbacks.success == "function") {
                        callbacks.success(response.result);
                    }
                },
                error: function(response) {
                    if (typeof callbacks.error == "function") {
                        callbacks.error(response);
                    }
                }
            });
        },
        remove: function(model, repository, callbacks) {
            if (!model.isNew()) {
                var data = {
                    appkey: "6s5dq4f68qzdf7sd",
                    model: model.name,
                    data: model.toJson(true)
                };

                return makeRequest(this.settings.ws + ".delete", {
                    params: data,
                    success: function(response) {
                        if (typeof callbacks.success == "function") {
                            callbacks.success(response.result);
                        }
                    },
                    error: function(response) {
                        if (typeof callbacks.error == "function") {
                            callbacks.error(response);
                        }
                    }
                });
            }

        },
        update: function(model, repository, callbacks) {
            var promise = null;
            if (!model.isNew()) {
                promise = makeRequest(this.settings.ws + ".update", {
                    params: {
                        data: model.toJson(true)
                    },
                    success: function(response) {
                        if (typeof callbacks.success == "function") {
                            callbacks.success(response.result);
                        }
                    },
                    error: function(response) {
                        if (typeof callbacks.error == "function") {
                            callbacks.error(response);
                        }
                    }
                });
            }
            else {
                promise = this.create(model, repository, callbacks);
            }
            return promise;
        },
        /* repositoryMethod */
        find: function(repositoryName, id) {
            var repository = repositoryName.replace(/repository/gi, "");
            return makeRequest(this.settings.ws + ".find", {
                params: {
                    appKey: "6s5dq4f68qzdf7sd",
                    model: repository,
                    criteria: id
                }
            });
        },
        findAll: function(repositoryName, options) {
            var repository = repositoryName.replace(/repository/gi, "");
            var options = options || {};
            var result = [];
            var params = {
                appKey: "6s5dq4f68qzdf7sd",
                model: repository,
                criteria: options
            }

            /**
             *handle options here 
             * pagination etc 
             **/
            makeRequest(this.settings.ws + ".findAll", {
                params: params,
                async: false,
                success: function(response) {
                    result = response.result;
                },
                error: function() {
                }

            });
            return result;//should be async
        }

    };
    AdapterRegistry.register("jsonrpc", jsonRpcAdapter);
});
