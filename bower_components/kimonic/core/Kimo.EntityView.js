define(["jquery", "Kimo.Observable"], function (jquery, Observable) {
    var $ = jquery;
    var _entityViewContainer = {};
    var _handleEvents = function(events){
        if(!$.isPlainObject(events)) return;
        var self = this;
        $.each(events,function(eventsString,callback){
            var eventsInfos = eventsString.split(" ");
            if(eventsInfos.length >= 2){
                var selector = $.trim(eventsInfos[0]);
                var event = $.trim(eventsInfos[1]);
                callback = (typeof callback==="string") ? $.proxy(self[callback],self):callback;
                if( selector === "root"){
                    $(self.root).bind(event,callback);
                }else{
                    $(self.root).on(event, $.trim(selector), callback);
                }
            }
        });
    }

    var AbstractEntityView = {
        onCreate: function(settings){
            Observable.extend(this);
            this.root = null;
            this.entity = null;
            this.id = null;
            $.extend(true, this, settings);
            this.init();
            this.checkMandatoryParams();
            _handleEvents.call(this,this.events);
        },

        checkMandatoryParams: function () {
            if (!this.root || !Kimo.jQuery(this.root).length) {
                var msg = "The view ["+this.name+"] must have a root element!";
                throw new Error("Kimo.EntityViewException. " + msg);
            }
        },
        onDestroy: function () {},
        
        render: function(){},

        toHtml: function(){},

        destroy: function() {
            if (typeof this.onDestroy === 'function') {
                this.onDestroy();
            }
        this.trigger("destroy");
        }
    };

    var _registerEntityView = function(config){
        var properties = {};
        var methods = {};
        /* clean properties */
        $.each(config,function(key,type){
            if(typeof type==="function"){
                methods[key]= type;
            }else{
                properties[key] = type;
            }
        });

        var Constructor = function EntityView(settings){
            $.extend(this,properties);
            this.onCreate(settings);
        }
        var cloneAbstract = $.extend(true,{},AbstractEntityView);
        Constructor.prototype = $.extend(true,cloneAbstract,methods);
        if(typeof properties.name==="string"){
            _entityViewContainer[properties.name] = Constructor;
        }
        return Constructor;
    }

    var _createEntityView = function(name,settings){
        var result = null;
        if(_entityViewContainer[name]){
            result = new _entityViewContainer[name](settings);
        }
        return result;
    }
    /*api*/
    Kimo.registerEntityView = _registerEntityView;
    Kimo.createEntityView = _createEntityView;

    return{
        registerEntityView : _registerEntityView,
        createEntityView:_createEntityView
    }

});

