define(["Kimo.Utils", "Kimo.Observable", "jquery", 'require'], function(Utils, Observable, jQuery) {

    var ActivityManager = (function(c, b) {
        var g = []; //activities container
        var h = {};
        var _context = {}; //swith later to an activity Manager Factory. core.createActivityManager().init();
        var _router = null;
        var _routes = {};

        /* init -> create a new activity map for the current map */
        var f = function(j) {
            if ("appname" in j) {
                _createActivityMap(j.appname);
                _context[j.appname].viewManager = j.viewManager;
            }
            // c.extend(true,h,j);
        };

        var _createActivityMap = function(appname) {
            _context[appname] = {
                activities: [],
                viewManager: null,
                router: null
            };
        }

        var _setRouter = function(router) {
            if (router) {
                _router = router;
            }
        }
        var _getRouter = function(appname) {
            var appname = appname;
            return function(activityName, params, apname) {
                appname = apname || appname;
                return _router.navigateTo(activityName, params, appname);
            }
        }

        var i = function() {
            this._init = function() {
                if (_context[this.appname]) {
                    if ("viewManager" in _context[this.appname]) {
                        this.viewManager = _context[this.appname].viewManager;
                    }
                }
                Observable.extend(this);
                this.registerEvents(["viewReady"]);
                this.navigateTo = _getRouter(this.appname);
                this.initView();
                this.exposedActions = [];
                this._handleEvents();
                this._handlePublicActions();
            };

            this.afterRender = function() {
                console.log("Implements after Render")
            }
        };

        var e = function(j) {
        };
        i.prototype = {
            setContentView: function(j) {
                if (typeof j.name != "string") {
                    throw new Error("view must have an name");
                }
                if (typeof this.afterRender == "function") {
                    j.afterRender = $.proxy(this.afterRender, this);
                }
                this.view = this.viewManager.addView(j);
            },
            invoke: function(k, j) {
                var k = k || "none";
                if ($.inArray(k, this.exposedActions) !== -1) {
                    var params = ($.isArray(j)) ? j : [j];
                    return this["public_" + k].apply(this, params);
                } else {
                    throw "MethodIsNotExposed: " + k;
                }
            },
                    
            setLoadedTemplate: function(template) {
                this.loadedTemplate = template;
            },
                    
            getLoadedTemplate: function() {
                return this.loadedTemplate;
            },
            
            triggerViewReady: function (render) {
                this.trigger("viewReady", render);
                this.detach("viewReady");
            },
                    
            getContent: function(url) {
                var result = false;
                $.ajax({
                    url: url,
                    async: false,
                    success: function(response) {
                        result = $(response);
                    }
                });
                return result;
            },
            _handlePublicActions: function() {
                var self = this;
                $.each(this, function(k, m) {
                    var j = /^public_/ig;
                    if (typeof m === "function") {
                        if (j.test(k)) {
                            var method = k.replace("public_", "");
                            self.exposedActions.push(method);
                        }
                    }
                })
            },
            _handleEvents: function() {
                var k = [];
                var j = this;
                if (typeof this.events != "object")
                    return;
                c.each(this.events, function(l, n) {
                    var m = {
                        selector: "",
                        eventType: "",
                        callback: null
                    };

                    if (typeof j[n] == "function") {
                        m.callback = $.proxy(j[n], j);
                    } else {
                        return true
                    }
                    var l = l.split(" ");
                    m.eventType = c.trim(l[l.length - 1]);
                    m.selector = c.trim(l[0]);
                    k.push(m);
                    c(j.view.view).delegate(m.selector, m.eventType, m.callback);
                })
            }
        };

        /*handle prefix*/
        var _registerRoutes = function(appkey, activityName, routes) {
            if (_routes[appkey] == "undefined") {
                _routes[appkey] = {};
            }
            var activitiesRoutes = {};
            activitiesRoutes[activityName] = routes;
            activitiesRoutes = c.extend(true, _routes[appkey], activitiesRoutes);
            _routes[appkey] = activitiesRoutes;
            return _routes;
        }

        /*main callback dispatch to activity...meaning... stop current activity/ start the activity holding the view */

        var _createActivity = function(l, j) {

            var k = function(params) {
                c.extend(this, j);
                this._init();
                if (typeof this.onCreate == "function") {
                    this.onCreate(params);
                }
            };
            k.prototype = new i();

            /*handle routes here*/
            if ("routes" in j) {
                _registerRoutes(j.appname, l, j.routes);
            }

            var activity = {
                name: l,
                appname: j.appname,
                activity: k,
                instance: null,
                state: 0 //0 stop - start - pause
            };

            /*save activity in his app context*/
            if (typeof j.appname != "undefined") {
                if (typeof _context[j.appname] != "undefined") {
                    _context[j.appname].activities.push(activity);
                }
            }
            g.push(activity);
        };

        var _start = function(activityName, params, appname) {
            var k = false,
                    dfd = new jQuery.Deferred(),
                    activityInfos = _findActivity(activityName);
            if (activityInfos) {
                if (typeof activityInfos.instance.onResume === "function") {
                    activityInfos.instance.onResume(params);
                    activityInfos.state = 1;
                    dfd.resolve(activityInfos);
                }
            }
            if (!activityInfos) {
                Utils.requireWithPromise(['activity!' + appname + ':' + activityName]).done(function(response) {
                    activityInfos = _findActivity(activityName);
                    if (!activityInfos) {
                        dfd.reject(response);
                    }
                    if (!activityInfos.instance) {
                        activityInfos.instance = new activityInfos.activity(params);
                    }
                    activityInfos.state = 1;
                    dfd.resolve(activityInfos);
                }).fail(function(reason) {
                    dfd.reject(reason);
                });
            }
            return dfd.promise();
        };

        var _stop = function(params) {
            if (typeof params === "string") {
                var activityInfos = _findActivity(params);
                activityInfos.state = 2;
            }
            if (typeof params === "object") {
                params.state = 2;
                activityInfos = params;
            }

            if (typeof activityInfos.instance.onStop === "function") {
                activityInfos.instance.onStop();
            }

        };

        var _count = function() {
            return g.length;
        }

        var _getRoutes = function(appkey) {
            return _routes[appkey];
        }

        var _findActivity = function(activityName) {
            var result = false;
            $.each(g, function(i, activityInfos) {
                if (activityInfos.name == activityName) {
                    result = activityInfos;
                    return false;
                }
            });
            return result;
        }

        var _invoke = function(activity, data) {
            try {
                var activityInfos = activity.split(":");
                if ($.isArray(activityInfos) && activityInfos.length != 2)
                    throw "InvalidMethodInvocation";
                activityInfos = _start($.trim(activityInfos[1]), {}, $.trim(activityInfos[0]));
                if ((typeof data.method == "string")) {
                    var params = data.params || [];
                    return activityInfos.instance.invoke(data.method, params);
                }
                throw "ErrorWhileInvokingMethod " + activity;
            }
            catch (e) {
                console.log(e);
                throw e;
            }


        }
        return{
            init: f,
            invoke: _invoke,
            createActivity: _createActivity,
            startActivity: _start,
            stopActivity: _stop,
            find: _findActivity,
            setRouter: _setRouter,
            count: _count
        }
    })(jQuery, window);
    Kimo.ActivityManager = ActivityManager;
    return ActivityManager;
});
