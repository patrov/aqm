define(["Kimo.Utils","Kimo.ModelAdapter"], function(Utils, AdapterRegistry){
    var makeRestRequest = Utils.makeRestRequest;
    var restAdapter = {
        settings: {
            availableActions: ["create", "read", "update", "remove"],
            envelope: "result"
        },

        invoke: function(action, model, repository, callbacks, params) {
            if (this.settings.availableActions[action] == "undefined")
                return false;
            if (typeof repository != "string")
                return false;
            return this[action].call(this, model, repository, callbacks, params);
        },

        invokeRest : function(action,model,repository,callbacks,params){
            if (this.settings.availableActions[action] == "undefined") throw new "InvalidMethod";
            return this[action].call(this, model, repository,callbacks,params);
        },

        create: function(model, repository, callbacks) {

            var data = {
                model: model.name,
                data: JSON.stringify(model.toJson(true))
            },
                self = this;
            return makeRestRequest(model.getPath(), {
                data: data,
                type: "POST",
                success: function(response) {
                    if(self.settings.envelope) {
                        response = response[self.settings.envelope];
                    }
                    model.setUid(response.uid);
                    if (typeof callbacks.success == "function") {
                        callbacks.success(response);
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
                    model: model.name,
                    data: model.toJson(true)
                };
				var self = this; 
                return makeRestRequest(model.getPath() + "/"+parseInt(model.getUid()), {
                    type: "DELETE",
                    success: function(response) {
                        if (typeof callbacks.success === "function") {
							if (self.settings.envelope) {
								response = response[self.settings.envelope];
							}
                            callbacks.success(response);
                        }
                    },
                    error: function(response) {
                        if (typeof callbacks.error === "function") {
                            callbacks.error(response);
                        }
                    }
                });
            }
        },
        update: function(model, repository, callbacks) {
            var promise = null;
            if (!model.isNew()) {
                promise = makeRestRequest(model.getPath(), {
                    data :{ data : JSON.stringify(model.toJson(true)) },
                    type: "PUT",
                    success: function(response) {
                        if (typeof callbacks.success == "function") {
							if (self.settings.envelope) {
							response = response[self.settings.envelope];
							}		
                            callbacks.success(response);
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
            var repositoryInstance = Kimo.ModelManager.getRepository(repositoryName);
            var repository = repositoryName.replace(/repository/gi, "");
            return makeRestRequest(repositoryInstance.getPath()+"/"+id, {
                params: {
                    type:"GET"
                }
            });
        },

        findAll: function(repositoryName, options) {
            var repositoryInstance = Kimo.ModelManager.getRepository(repositoryName);
            var repository = repositoryName.replace(/repository/gi, "");
            options = options || {};
            return makeRestRequest(repositoryInstance.getPath()+"/findAll/"+repository, {
                type:"GET"
            });

        }
    };

    AdapterRegistry.register("restAdapter",restAdapter);
});