/**
 *
 * must create a router instance
 *
 **/
define(["Kimo.ActivityManager", "Kimo.Observable", "vendor.crossroads.main", "vendor.handlebars", "hasher"], function(ActivityManager, Observable, crossroads, Handlebars, hasher) {

    var NavigationManager = (function($, global) {
        var _settings = {},
                _activityManager = null,
                _currentActivityInfos = null,
                _viewManager = null,
                _router = null,
                _appInstance = null,
                _routeInfos = {};

        /**
         *return router
         **/
        var _init = function(userSettings) {
            _settings = $.extend(true, _settings, userSettings);
            _activityManager = _settings.activitiesManager || false;
            _viewManager = _settings.viewManager || false;
            _currentActivityInfos = _settings.currentActivityInfos;
            _appInstance = _settings.appInstance;
            _router = new Router(_activityManager, _viewManager, _currentActivityInfos, _settings.appName);//oneRoute per application
            return _router;
        };

        var _listen = function() {
            hasher.changed.add(_handleActivityEvents);
            hasher.initialized.add(_handleActivityEvents);
            hasher.init();
        };

        /*register all  the app routes*/
        var _registerRoutes = function(appName, routes) {
            _routeInfos[appName] = routes;
        };

        var _handleActivityEvents = function(newHash, oldHash) {
            crossroads.parse(newHash);
        };

        var Router = function Router(am, vm, caInfos, appName) {
            this._init = function(am, vm, caInfos, appName) {
                this._history = {};
                this._parameterBags = {};
                this._activityManager = am;
                this._activityManager.setRouter(this);//Change
                this._viewManager = vm;
                this._appName = appName;
                this._currentActivityInfos = caInfos;
                this._routesCollection = _routeInfos[this._appName];
                if (!this._routesCollection) {
                    throw new Error("Routes can't be found for Application  [" + this._appName + "]");
                }
            }
            this._init(am, vm, caInfos, appName);
            this._handleRoutes();
            this._handleAppLinks();
        };

        /* how to handle routes */
        Router.prototype._handleRoutes = function() {
            var routes = this._routesCollection;
            var self = this;
            $.each(routes, function(routename, routeInfos) {
                /*handle route then handle params*/
                var callback = (function(routeInfos) {
                    return function(routeParams) {
                        self.routeTo(routeInfos, routeParams);
                    };
                })(routeInfos);
                crossroads.addRoute(routeInfos.url.replace("#/", ""), callback);
            });
        };

        Router.prototype._handleAppLinks = function() {
            var self = this;
            $("body").on("click", "a", function() {
                var nextAction = $(this).data("action");
                var hash = $(this).attr("href");
                if (hash && hash.indexOf("#/") !== -1) {
                    return; //link is handle by crossroad[+]  hasher
                }
                if (nextAction) {
                    self.navigateTo(nextAction);  //each app has its own root
                }
            });
        };

        /* Follow the  links */
        Router.prototype.routeTo = function(routeInfos, params) {
            var self = this;
            if (typeof routeInfos !== "object") {
                throw "RouterExceptio:routeTo RouteInfos";
            }
            var routeActions = routeInfos["action"];
            routeActions = routeActions.split(":");
            if (routeActions.length != 2)
                throw "invalid route form";
            if (this._currentActivityInfos) {
                this._activityManager.stopActivity(this._currentActivityInfos);
            }

            var cleanUrl = routeInfos.url.replace("#/", "");
            //var params =  $.extend(true,params,this._parameterBags[cleanUrl]);
            ActivityManager.startActivity(routeActions[0], {}, this._appName).done(function(activityInfos) {

                self._currentActivityInfos = activityInfos;
                var viewName = activityInfos.instance.view.name;
                self._viewManager.gotoView(viewName);
                /* execute actions */

                var activityAction = routeActions[1] + "Action";
                /* change to invoke */
                if (routeInfos.hasOwnProperty('templateName')) {
                    routeActions[1] = routeInfos.templateName;
                }
                if (typeof self._currentActivityInfos.instance[activityAction] === "function") {
                    var templateInfos = routeActions.join('.');

                    var layoutDep = 'layout!' + self._appName + "." + routeActions[0];
                    var useLayout = activityInfos.instance.useLayout;
                    /* should be override by user */
                    if (!useLayout) {
                        layoutDep = 'layout!no-layout';
                    }

                    require(['template!' + self._appName + '.' + templateInfos, layoutDep], function(template, layout) {
                        var tpl = $(template),
                            layout = layout || $(layout);

                        self._currentActivityInfos.instance.setLoadedTemplate(tpl);
                        var templateData = self._currentActivityInfos.instance[activityAction](params, self._parameterBags[cleanUrl]);
                        var templateContent = Handlebars.compile($(tpl).get(0).outerHTML); // components should be ready here
                        var render = $(templateContent(templateData || {}));

                        if (layout.length) {
                            /* find kimo main zone */
                            layout.find(".main-zone").eq(0).html(render);
                            render = layout;
                        }
                        if (!self._currentActivityInfos.instance.view.isRendered) {
                            console.log(_appInstance.getParam("mainViewContainer"));
                            self._currentActivityInfos.instance.viewManager.render(_appInstance.getParam("mainViewContainer"));
                        }
                        self._currentActivityInfos.instance.view.setContent(render);
                        self._currentActivityInfos.instance.triggerViewReady(render);
                    }, function() {
                        /*handle default error default error page */
                        self._currentActivityInfos.instance[activityAction](params, self._parameterBags[cleanUrl]);
                    });
                   
                } else {
                    throw "action :" + activityAction + " can't be found in " + routeActions[0];
                }
            }).fail(function(reason) {
                throw "Activity [" + reason.path + "] can't be found!";
            });
        }

        Router.prototype.buildLink = function(path, params) {
            var link = path;
            if ($.isPlainObject(params)) {
                $.each(params, function(pattern, value) {
                    link = link.replace('{' + pattern + '}', value);
                });
            }
            return link;
        };

        Router.prototype.updateRoute = function(route) {
            history.pushState(null, null, route);
        };

        Router.prototype.navigateTo = function(route, params, linkParams) {
            try {
                if (typeof route !== "string" || route.length === 0)
                    throw "Route can't be null or empty!";
                params = params || {}; /*request*/
                var routeInfos = this._routesCollection[route];
                if (!routeInfos)
                    throw "Route [" + route + "] Can't be found for [" + this._appName + "]";
                if ("url" in routeInfos) {
                    var cleanUrl = routeInfos.url.replace("#/", "");
                    linkParams = linkParams || routeInfos.defaultParams;
                    if (!linkParams) {
                        linkParams = routeInfos.defaultParams || false;
                    }
                    cleanUrl = this.buildLink(cleanUrl, linkParams);
                    /*save parameter */
                    this._parameterBags[cleanUrl] = params;
                    hasher.setHash(cleanUrl);
                } else {
                    throw "url can't be found for route[" + route + "] in [" + this._appName + "]";
                }

            } catch (e) {
                console.log(e);
                throw e;
            }
        };

        Router.prototype.back = function() {
        }

        var publicApi = {
            navigateTo: function(activityName, params, appname) {
                /*first stop current activity if needed --> activity Manager responsability*/
                if (_currentActivityInfos) {
                    _activityManager.stopActivity(_currentActivityInfos);
                }
                _activityManager.startActivity(activityName, params).done(function(activityInfos) {
                    _currentActivityInfos = activityInfos;
                    _viewManager.gotoView($(activityInfos.instance.view).attr("id"));
                });
            },
            back: function() {
            }
        };

        return {
            init: _init,
            start: _listen,
            navigateTo: publicApi.navigateTo,
            registerRoutes: _registerRoutes,
            getRouter: function() {
                return _router;
            }
        };
    })(jQuery, window);
    Kimo.NavigationManager = NavigationManager;
    return NavigationManager;
});
