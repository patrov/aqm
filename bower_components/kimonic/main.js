/*require path*/
/**
 * 1. first the core
 * 2. application
 **/
var Kimo = Kimo || {};
Kimo.require = (function(r) {
    r.config({
        baseUrl: appPath+"js/",
        urlArgs: 'rand=' + Math.random(),
        catchError:true,
        paths: {
            "Kimo.ActivityManager": "kimonic/core/Kimo.ActivityManager",
            "Kimo.ComponentHandler": "kimonic/core/Kimo.ComponentHandler",
            "Kimo.ApplicationManager": "kimonic/core/Kimo.ApplicationManager",
            "Kimo.DataView": "kimonic/core/Kimo.DataView",
            "Kimo.ModelManager": "kimonic/core/Kimo.ModelManager",
            "Kimo.DbManager": "kimonic/core/Kimo.DbManager",
            "Kimo.EntityView": "kimonic/core/Kimo.EntityView",
            "Kimo.FormManager": "kimonic/core/Kimo.FormManager",
            "Kimo.Iterator": "kimonic/core/Kimo.Iterator",
            "Kimo.TasksManager": "kimonic/core/Kimo.TasksManager",
            "Kimo.Observable": "kimonic/core/Kimo.Observable",
            "Kimo.ModelAdapter": "kimonic/core/Kimo.ModelAdapter",
            "Kimo.restAdapter": "kimonic/core/Kimo.adapter.rest",
            "Kimo.rpcAdapter": "kimonic/core/Kimo.adapter.jsonrpc",
            "Kimo.NavigationManager": "kimonic/core/Kimo.NavigationManager",
            "Kimo.ParamsContainer": "kimonic/core/Kimo.ParamsContainer",
            "Kimo.TemplateRenderer": "kimonic/core/Kimo.TemplateManager",
            "Kimo.Utils": "kimonic/core/Kimo.Utils",
            "activity": "kimonic/activity",
            "component": "kimonic/component",
            "manager": "kimonic/manager",
            "template": "kimonic/template",
            "layout": "kimonic/layout",
            "text": "kimonic/vendor/requirejs-text/text",
            "nanoscroller": "kimonic/vendor/nanoscroller/bin/javascripts/jquery.nanoscroller.min",
            "Kimo.ViewStack": "kimonic/core/Kimo.ViewStack",
            "jquery": "kimonic/vendor/jquery/dist/jquery.min",
            "signals": "kimonic/vendor/signals/dist/signals.min",
            "hasher": "kimonic/vendor/hasher/dist/js/hasher.min",
            "vendor.crossroads.main": "kimonic/vendor/crossroads/dist/crossroads.min",
            "vendor.handlebars": "kimonic/vendor/handlebars/handlebars.min",
            "jsclass": "kimonic/node_modules/jsclass/min/core",
            "bootstrap": "kimonic/vendor/bootstrap/dist/js/bootstrap.min",
            "vendor.dropzone":"kimonic/vendor/dropzone/dropzone.amd.module.min",
            "Form.image": "kimonic/formfields/image/main"
        },
        shim: {
            'Kimo': {
                exports: "Kimo"
            },
            'bootstrap': {
                deps : ['jquery']
            }
        }

    });
    return r;
})(require);


define("Kimo/core",
    ["require", "jquery",
    "Kimo.Observable",
    "Kimo.ComponentHandler",
    "Kimo.Utils",
    "Kimo.Iterator",
    "Kimo.TasksManager",
    "Kimo.ViewStack",
    "Kimo.ActivityManager",
    "Kimo.TemplateRenderer",
    "Kimo.ApplicationManager",
    "Kimo.DataView",
    "Kimo.ModelManager",
    "Kimo.DbManager",
    "Kimo.EntityView",
    "Kimo.FormManager",
    "Kimo.ModelAdapter",
    "Kimo.restAdapter",
    "Kimo.rpcAdapter",
    "Kimo.NavigationManager",
    "Kimo.ParamsContainer",
    "signals",
    "hasher",
    "vendor.crossroads.main",
    "vendor.dropzone",
    "bootstrap"
    //  "Form.image"
    ], function(require, jQuery) {
        Kimo.jquery = jQuery.noConflict(true);
        Kimo.jQuery =  Kimo.jquery;
        window.$ = Kimo.jquery;
        Kimo.jQuery =  Kimo.jquery;
        window.jQuery = jQuery;
        return Kimo;
    });
