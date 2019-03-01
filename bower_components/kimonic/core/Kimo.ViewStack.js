/* view Class */
/* a view
 * a view can have a title? oe his title is a part of his content?
 *
 * */
define(['jquery'], function(jQuery) {
    var View = function View(userSettings) {
        this.view = null;
        this._settings = {
            cls: "",
            name: false,
            title: "",
            content: "",
            size: {
                width: "98%",
                height: "98%"
            },
            enableActions: false
        };

        this._init = function() {
            $.extend(true, this._settings, userSettings);
            this.name = (typeof this._settings.name === "string") ? this._settings.name : false;
            if (!this.name) {
                throw "View should have a name";
            }

            this.width = parseInt(this._settings.size.width);
            this.height = parseInt(this._settings.size.height);
            this.create(this._settings.parentSize);
            if (typeof this._settings.content)
                this.setContent($(this._settings.contentEl));
        }
        this._init();
    }

    View.prototype = {
        setContent: function(content) {
            this.view.hide().html(content).fadeIn("fast");
        },

        create: function(containerSize) {
            var parentWidth = parseInt(containerSize.width);
            var parentHeight = parseInt(containerSize.height);

            var root = $("<div/>");
            root.addClass("view");
            root.addClass(this._settings.cls);
            root.attr("data-name", this.name);
            root.css("position", "");
            /* revoir cas pourcentage et cas px*/

            if(!isNaN(parentHeight)){
                var viewWidth = parentWidth * this.width / 100;
                var viewHeight = this.height * parentHeight / 100;

                var left = (parentWidth - viewWidth) / 2;
                var top = (parentHeight - viewHeight) / 2;
            }
           // root.css("border","1px solid blue");

            root.css("left", left + "px"); /*Important*/
            root.css("top", top + "px"); /*Important*/
            root.css("overflow", "hide");
            this.view = root;
        }
    };

    /**
     * ajouter action sur view stack
     * 1. minimizer
     * 2. add viewstack action
     *
     **/
    var ViewStack = function ViewStack(settings) {
        this.views = {};
        /* view stack Settings */
        this._settings = {
            size: {
                width: "500px",
                height: "500px",
                draggable: false,
                resizable: false
            },
            css: {
                position: "relative",
                padding: "10px"
                //border: "1px solid blue"
            }
        }
        this.template = null;

        /* create the skeleton */
        var _create = function() {
            var root = $("<div/>");
            $(root).attr("id", this._settings.id);
            $(root).addClass(this._settings.cls);
            var defaultCss = { };

            if (this._settings.hasOwnProperty("size")) {
                var position = this._settings.size.position || "";
            }

            if (position === "fixed") {
                defaultCss = {
                width: this._settings.size.width,
                height: this._settings.size.height,
                background: "#FFFFFF",
                margin: "auto",
                position: position
            };
            }


            $(root).css($.extend(true, defaultCss, this._settings.css));
            $(root).addClass("kimo ui viewstack");
            this.template = root;
        }

        this._init = function(settings) {
            settings = settings || {};
            $.extend(true, this._settings, settings);
            this.applyDraggable = (typeof this._settings.draggable == "boolean") ? this._settings.draggable : true;
            this.applyResizable = (typeof this._settings.resizable == "boolean") ? this._settings.draggable : false;
            _create.call(this);
        //if(this.applyDraggable) $(this.template).draggable({});
        //if(this.applyDraggable) $(this.temlate).resizable();
        }
        this._init(settings);
    }

    /*configure étend les params par défaut*/
    ViewStack.prototype.configure = function(settings) {
        var settings = (typeof settings == "object") ? settings : {};
        this._init(settings);
    }

    ViewStack.prototype.registerViews = function(views) {
        var viewContainer = document.createDocumentFragment();
        var self = this;
        views.forEach(function(viewConf, i) {
            viewConf.parentSize = self._settings.size;
            var viewName = viewConf.name;
            var view = new ViewStack.View(viewConf);
            viewContainer.appendChild($(view.view).get(0));
            self.views[viewName] = view;
        });
        /* add Views */
        this.template.append($(viewContainer));
    }

    ViewStack.prototype.addView = function(viewConf) {
        viewConf.parentSize = this._settings.size;
        var viewName = viewConf.name;
        var view = new ViewStack.View(viewConf);
        this.template.append($(view.view).get(0));
        this.views[viewName] = view;
        /*view is hidden*/
        $(view.view).hide();
        return view;
    }

    ViewStack.prototype.render = function(container, append) {
        if (!jQuery(container).length) {
            throw "KimoViewStackException Container "+container+ " can't be found!";
        }   
            if(this.isRendered) { return false; }
            this.render = (append) ? $(container).append(this.template) : $(container).replaceWith(this.template);
            this.isRendered = true;
    }

    ViewStack.prototype.selectView = function(viewname, content) {

        var view = this.views[viewname];
        if (this.currentView && (view.name === this.currentView.name)) {
            return this.currentView;
        }
        if (typeof view == "object") {
            this.template.find(".view").hide();
            if (content) {
                view.setContent(content);
            }
            $(view.view).show();
            this.currentView = view;
            return view;
        } else {
            throw "ViewManager:SelectView " + viewname + " can't be found";
        }
    }

    ViewStack.prototype.gotoView = function(viewname, content) {
        this.selectView(viewname, content);
    }

    ViewStack.View = View;
    Kimo.ViewStack = ViewStack;
    return ViewStack;
});
