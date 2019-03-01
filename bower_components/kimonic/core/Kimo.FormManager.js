/**
 * DataWrapper
 */

define(["Kimo.DbManager","Kimo.Observable","Kimo.Utils","vendor.dropzone"], function(DbManager,Observable,Utils,Dropzone ) {

    var DataWrapper = function(data) {

        this._init = function(data) {
            if (typeof data == "object") {
                this.data = data;
                if (("get" in data) && ("set" in data)) {
                    return data;
                }
                DataWrapper.prototype.get = function(key) {
                    return this.data[key];
                }

                DataWrapper.prototype.set = function(key, value) {
                    this.data[key] = value;
                }
                return this;
            }
        }
        return this._init(data);
    }

    var FormManager = (function($, global) {
        /**
         *FormManager
         * addItem(1)
         * addItem(2)
         * addItem(3)
         * render()
         **/
        var _instance = null;
        var _formFields = {};
        var _formConfig = {};
        var _defMap = {}; //name, def
        /*Eviter d'écraser les types par défaut*/
        /*responsabilités:
         * - Fournir Interface pour les type de champs
         * - Garder un catalogue des différents type de champs disponibles
         * - Rendre:afficher les différents Eléments
         * - Rendre:afficher le formulaire
         **/
        var _defaultValidator = function() {
            var event = {
                type: "error",
                message: "A validate function couldn't be found !"
            };
            this.trigger("error", event);
            return false;
        }

        var FormBuilder = function(name, config) {
            this.name = name;
            this.items = {};
            this.data = null;
            this.buttons = null;
            this.subforms = {};
            this.dynforms = {};
            this.hasSubforms = false;
            this.fieldHasDynform = {};
            this.hasDynform = false;
            this.dynformHandlers = {}; //keep track of handlers
            this.validator = _defaultValidator;
            this.init($.extend(true,{},config));
        }
        /* force the use of the validator */

        /*Prendre un compte le mapping des champs
         * ainsi que que les formulaires joints
         *
         **/
        var _bindFields = function(fieldsMap) {
            var self = this;
            for (var key in fieldsMap) {
                var value = fieldsMap[key];
                /*cas simple attr:ftype*/
                if (typeof value == "string") {
                    var fieldType = value;
                    var fieldsConfig = {};
                }
                /*cas fieldparam att:{}*/
                if (typeof value == "object") {
                    fieldType = value["type"];
                    fieldsConfig = value;
                    if ("dynform" in value) {
                        fieldType = "dynform";
                    }
                }
                /* vérifier si le type existe */
                var subformPattern = /subform/gi;
                //console.log("value :"+value);
                if (subformPattern.test(fieldType)) {
                    var subformInfos = fieldType.split(" ");
                    /*récupérer un sous-form*/
                    /*vérifier que le sous-form existe*/
                    var subform = _formConfig[subformInfos[1]];
                    this.subforms[key] = subform;
                    /*ref to the parent*/
                    subform.container = this;
                    subform.setData(this.data.get(key));
                    this.hasSubforms = true;
                /*handle change on subform and keep map infos*/
                }

                else if (fieldType == "dynform") {
                    _handleDynforms.call(this, key, fieldsConfig["dynform"]);
                }
                else {
                    if (typeof _formFields[fieldType] != "function")
                        console.warn("[form:" + this.name + "], [key: " + key + "] " + fieldType + " type can't be found.");
                    fieldsConfig.value = (this.data && this.data.get(key)) ? this.data.get(key) : "";
                    fieldsConfig.name = key;
                    fieldsConfig.mainForm = this;
                    this.items[key] = new _formFields[fieldType](fieldsConfig);
                    /* field has a ref the the form that contents the field*/
                    /*bind change here*/
                    console.log("", fieldsConfig.value);
                    var field = this.items[key];
                    var callback = (function(key) {
                        return function(value) {
                            self.data.set(key, value);
                        }
                    })(key);
                    if (this.data) {
                        field.on("valueChanged", callback);
                    }

                }
            }
        }


        /**
         * handle dynform
         **/
        var _parseDynformConditions = function(condition) {
            condition = (typeof condition == "string") ? condition : false;
            if (!condition)
                throw new Error("_parseDynformConditions : Condition must be a string");
            var conditionInfos = condition.split("=");
            return conditionInfos;
        }

        /**
         * if form has dynform
         **/
        var _dynformHandler = function(renderField) {
            /**
             * ajouter le formulaire après le champ qu'il controle
             **/
            var ctn = document.createDocumentFragment();
            ctn.appendChild(renderField.get(0));
            for (var key in this.dynformHandlers) {
                var dynformInfos = this.dynformHandlers[key];
                var condFunc = dynformInfos.cond;
                var field = this.getField(dynformInfos.fieldName);
                if (condFunc.call(this)) {
                    var form = _formConfig[dynformInfos.dynInfos.name];
                    form.container = this;
                    var data = this.data.get("data") || {};
                    form.setData(data);
                    var formToRender = form.render();
                    this.dynforms["source"] = form;
                    this.hasDynform = true;
                    var wrapper = $("<div class='dynFromWrapper'/>");
                    var classname = "data-ref" + field.id;
                    wrapper.append(formToRender);
                    $(wrapper).addClass(classname);
                    $("." + classname).remove();
                    ctn.appendChild(wrapper.get(0));
                }
            }
            return ctn;
        }
        /* Add new field dependOn field name */
        var _handleDynforms = function(fieldname, params) {
            //var field = this.getField("type"); //do after
            for (var key in params) {
                var formInfos = params[key];
                var condition = formInfos.condition;
                var field = false;

                if (typeof condition == "string") {
                    var conditionInfos = _parseDynformConditions(condition);
                    var conditionValue = $.trim(conditionInfos[1]);
                    var fieldName = $.trim(conditionInfos[0]); //handle field from other form;
                    var funcBody = "return this.getField('" + fieldName + "').getValue() =='" + conditionValue + "';";
                    var conditionFunc = new Function("value", funcBody);
                    var field = this.getField(fieldName);
                }

                if (typeof condition == "function") {
                    conditionFunc = condition;
                    var fieldName = formInfos.bindTo;
                    var field = this.getField(fieldName);
                }

                if (fieldName)
                    this.fieldHasDynform[fieldName] = true;
                var dynformInfos = {
                    fieldName: fieldName,
                    cond: conditionFunc,
                    dynInfos: formInfos
                };
                this.dynformHandlers[key] = dynformInfos;

                //this.dynformHandlers[] =
                var self = this; //form -> source
                var callback = (function(formInfos, conditionFunc) {
                    return function(value) {
                        if (conditionFunc.call(self)) {
                            var form = _formConfig[formInfos.name];
                            form.container = self;
                            var data = self.data.get(fieldname) || {};
                            form.setData(data);
                            var formToRender = form.render();
                            self.dynforms[fieldname] = form;
                            self.hasDynform = true;
                            var wrapper = $("<div/>");
                            wrapper.append(formToRender);
                            var classname = "data-ref" + field.id;
                            $(wrapper).addClass(classname);
                            $("." + classname).remove();
                            if (typeof condition.renderer == "function") {
                            }
                            $(field.field).after(wrapper);
                        }
                    }
                })(formInfos, conditionFunc);
                field.on("valueChanged", callback);
            }

        }



        /***
         * Specifier si nécéssaire live update
         * onSubmit --> mettre à jour l'entity
         **/
        var _handleBtns = function(btnConfigs) {
            btnConfigs = btnConfigs || {};
            var btnWrapper = $("<p/>").clone();
            for (var i in btnConfigs) {
                var btnCnf = btnConfigs[i];
                var input = $("<input>").clone();
                var type = (typeof btnCnf.type == "string") ? btnCnf.type : "button";
                $(input).addClass("btn btn-link");
                $(input).attr("type", type);
                $(input).attr("value", btnCnf.text);
                var self = this;
                if (type == "submit") {
                    $(input).bind("click", function(e) {
                        self.submit();
                    });
                }
                else {
                    $(input).bind("click", function(e) {
                        self.trigger("cancel", {
                            type: "cancel"
                        });
                    });
                }
                btnWrapper.append(input);
            }
            this.buttons = btnWrapper;

        }

        FormBuilder.prototype.setValidator = function(validateFunc) {
            if (typeof validateFunc != "function")
                throw "NoValidatorFound";
            this.validator = validateFunc;
        }

        FormBuilder.prototype.submit = function() {
            var data = this.getData(true);
            if (this.validator(data)) {

                var event = {
                    type: "submit",
                    data: {
                        entity: this.getData(),
                        rawData: data
                    }
                };
                this.trigger("submit", event);
                return;
            }
            throw "[FormBuilder:submit] form data is not valid!";
        },

        FormBuilder.prototype.validate = function() {
            var data = this.getData(true);
            return this.validator(data);
        }

        /** add dynamically a new field to the form */
        FormBuilder.prototype.appendField = function(fieldsConfig, register) {
            var fieldType = fieldsConfig.type;
            var key = fieldsConfig.name;
            if (typeof _formFields[fieldType] != "function")
                console.warn("[form:]" + this.name + " [key: ]" + key + " " + fieldType + " type can't be found.");
            //fieldsConfig.value = (this.data && this.data.get(key)) ? this.data.get(key) : ""; //chre
            var field = new _formFields[fieldType](fieldsConfig); //where to save the content?
            /* a field has a ref the the form that contents the field*/
            this.items[key] = field;
            if (register)
                this.items[key] = field;

            this.items[key].mainform = this;
            /*bind change here*/
            var self = this;
            var callback = (function(key) {
                return function(value) {
                    self.data.set(key, value);
                }
            })(key);
            if (this.data) {
                field.on("valueChanged", callback);
            }
            FormManager.EventHub.trigger("renderField", {
                form: self,
                field: field,
                itemRender: field.render()
            });

            return field;
        }

        /** removefield*/
        FormBuilder.prototype.removeField = function(field, silent) {

        }



        FormBuilder.prototype.init = function(config) {
            var self = this;
            var mixin = $.extend(true, {}, Observable);
            $.extend(this, mixin);
            this.mainWrapper = (typeof config.mainWrapper=="string") ? $(config.mainWrapper) : $("<form>");

            this._registerEvents(["submit", "cancel", "error", "mouseIn", "mouseOut","beforeRender"]);
            this.fieldsMap = config.map;

            /* handle plugins fields plugin here */
            if ("plugins" in config) {
                if ($.isArray(config["plugins"])) {
                    var plugins = config["plugins"];
                    FormPluginManager.handlePlugins(plugins); //show handle BeforeRender
                }
            }

            if ("data" in config && config.data) {
                this.data = new DataWrapper(config.data);

                FormManager.EventHub.trigger("processFieldMap", {
                    form: this,
                    fieldMap: this.fieldsMap
                });

                _bindFields.call(this, this.fieldsMap);
            }
            /*build btn here*/
            if ("buttons" in config) {
                _handleBtns.call(this, config["buttons"]);
            }

            if ("validator" in config) {
                if (typeof config["validator"] == "function") {
                    this.setValidator(config.validator);
                }
            }
            if("beforeRender" in config){
                if(typeof config["beforeRender"]=="function"){
                    this.beforeRender = config.beforeRender;
                }
            }
        }

        /**
         *Afficher les champs du formulaire
         *before render(name, callback)
         */
        FormBuilder.prototype.render = function(container) {
            container = container || null;

            var renders = document.createDocumentFragment();
            var fieldRenderMap = {};
            /*handler before render : form and fields*/
            var self = this;
            $(renders).bind("mouseenter", function() {
                self.trigger("mouseOn", self);
            });

            $(renders).bind("mouseleave", function() {
                self.trigger("mouseOut", self);
            });

            var dynformHandler = _dynformHandler;
            $.each(this.items, function(key, item) {
                var itemRender = item.render();
                if (typeof item.afterRender == "function") {
                    itemRender = item.afterRender(itemRender);
                }
                /* if field is bound to a dynform fix add after */
                if (self.fieldHasDynform[key]) {
                    itemRender = dynformHandler.call(self, itemRender);
                }

                FormManager.EventHub.trigger("renderField", {
                    form: self,
                    field: item,
                    itemRender: itemRender
                });
                fieldRenderMap[key] = $(itemRender);
                renders.appendChild($(itemRender).get(0));
            });

            /* handle subform events too before */
            $.each(this.subforms, function(i, subform) {
                renders.appendChild(subform.render());
            });

            /* FormRender event allows us to update the render --> if so  the render object should be global */
            FormManager.EventHub.trigger("beforeRender",{
                form: self,
                renders: renders
            })

            if (this.buttons) {
                renders.appendChild(this.buttons.get(0));
            }

            if(typeof this.beforeRender=="function"){
                renders =  this.beforeRender(fieldRenderMap,renders).get(0);
            }

            renders = this.mainWrapper.append($(renders));

            if (container) {
                $(container).append(renders);
                renders = container;
            }
            return renders;
        }

        /**
         * valider chaque champ
         * renvoyer les données
         * raw les envoie sous form de tableau
         **/
        FormBuilder.prototype.getData = function(raw) {
            raw = (typeof raw == "boolean") ? raw : false;
            var data = (raw) ? {} : this.data;
            if (raw) {
                /*handle items--> forms fields */
                $.each(this.items, function(i, item) {
                    data[i] = item.getValue();//fieldname --> value
                });
                /**
                 *handle subforms
                 **/
                if (this.hasSubforms) {
                    data["subforms"] = {};
                    $.each(this.subforms, function(i, subform) {
                        data["subforms"][subform.name] = subform.getData(raw);
                    });
                }
                /**
                 *handle dynform
                 **/
                if (this.hasDynform) {
                    $.each(this.dynforms, function(i, form) {
                        data[i] = form.getData(raw);
                    });
                }
            }
            /**Plugins might be insterested in the data*/
            FormManager.EventHub.trigger("processFormData", {
                formName: this,
                formData: data
            });
            return data;


        }

        /* bind a dataset to the map */
        FormBuilder.prototype.setData = function(data) {
            data = data || {};
            this.data = new DataWrapper(data);
            _bindFields.call(this, this.fieldsMap);
        }

        FormBuilder.prototype.getField = function(fieldname) {
            var fieldInfos = fieldname.split(":");
            if (fieldInfos.length == 2) {
                var subformName = fieldInfos[0];
                return this.subforms[subformName].getField(fieldInfos[1]);
            }
            if (this.items[fieldname]) {
                return this.items[fieldname];
            }
            return null;
        }

        FormBuilder.prototype.reset = function() {
            this.data = null;
        /* call reset everywhereS*/
        }

        /* generic error handler */
        FormBuilder.prototype.handleError = function(errors) {
            var self = this;
            $.each(errors, function(key, fieldInfos) {
                if ($.isPlainObject(fieldInfos)) {
                    if (typeof fieldInfos.field == "string") {
                        var field = self.getField(fieldInfos.field);
                        var mainField = field.getMainField();
                        $(mainField).addClass("hasError");
                        $(mainField).unbind("focus.error");
                        $(mainField).bind("focus.error", function() {
                            if ($(this).hasClass("hasError")) {
                                $(this).removeClass("hasError");
                            }
                        })
                    }
                }
            });
        }

        /*Field Builder*/
        var FieldBuilderAbstract = {
            _initialize: function() {
                var mixin = $.extend(true, {}, Observable); /*Create an implement function Implement(Interface,Observable)*/
                $.extend(this, mixin);
                this.id = new Date().getTime() + "_" + Math.ceil(Math.random() * 1000);
                this.fieldType = "";
                this.fieldName = "";
                this._oldValue = false;
                this.events = ($.isArray(this.events)) ? this.events : [];
                this._value = this._settings.value;
                this.mainFormWrapper = this._settings.mainForm.mainWrapper;
                var events = $.merge(this.events, ["valueChanged", "beforeRender", "afterRender"]);
                this._registerEvents(events); //more to come
                this.init();
                this.populate();
                this._oldValue = this._settings.value;
            },
            _settings: {},
            /**
             *remove trigger from extended object
             **/
            notify: function(eventName, eventData) {
                if (typeof eventName != "string")
                    throw("notify : eventname must be a string");
                var event = {
                    type: eventName
                };
                event.data = eventData;
                this.trigger(eventName, event, true);
            },
            setCallback: function(key, func) {
                this[key] = $.proxy(func, this);
            },
            init: function() {
                console.log("a init function must be provided");
            },
            getSettings: function() {
                return this._settings;
            },

            getFieldName: function() {
                return this._settings.name;
            },

            getMainWrapper : function(){
                return this.mainFormWrapper;
            },

            getMainForm: function() {
                return this._settings.mainform;
            },

            getLabelField: function() {
                console.warn({
                    error: "getLabelField not implemented in form:" + this.getMainForm().name + " for field: " + this.getFieldName()
                });
            },
            /*new method to handle field_template*/
            getFieldTemplate: function(template, data) {
                var templateToUse = this.form.template || "default";
                templateToUse = template || templateToUse;
                template = FormRenderer.getRenderer(templateToUse).parse(this.fieldName, data);
                if (!FormRenderer.isTemplateValid(data, template))
                    throw "Error while render template " + template;
                return template;
            },
            render: function() {
                console.log("A render function must be provided");
            },
            /* overwrite those functions
             * When setValue is called a change event must be triggered
             * try to trigger error
             * prevent recursive trigger
             **/
            setValue: function(value) {
                var newvalue = value || false;
                /*implementer la function is dirty*/
                if (!newvalue)
                    return;
                //if(newvalue == this._oldValue) return;
                //var oldValue = this._value;
                //this._oldValue = oldValue;
                this._value = newvalue;
                this.trigger("valueChanged", newvalue, this);
            },
            getValue: function() {
                return this._value;
            },
            getName: function() {
                return this._settings.name;
            },
            getMainField: function() {
                var inputField = this.field.find("input").eq(0);
                if ($.isEmptyObject(inputField)) {
                    throw new Exception("getMainField must be implemented");
                }
                return inputField;
            },
            validate: function() {
                return true;
            }
        };

        /*Mock Function*/
        var _registerField = function(fieldType, config) {
            if (typeof fieldType == "string" && !fieldType.length)
                throw new Error("FieldName can't be null");
            var MockFunction = function() {
                var properties = {};
                for (var property in config) {
                    if (typeof property !== "function") {
                        properties[property] = config[property];
                    }
                    /*extends properties*/
                    $.extend(true, this, properties);
                }
            }

            /**
             * The idea is to create a constructor
             * */
            var FieldRendererConstructor = (function(definition) {
                return function(userSettings) {
                    var properties = {};
                    for (var property in definition) {
                        if (typeof property !== "function") {
                            properties[property] = config[property];
                        }
                    }
                    this._settings = $.extend(true, {}, this._settings);
                    $.extend(true, this, properties);
                    $.extend(true, this._settings, userSettings); //extends default setting by user settings
                    this._initialize();

                }
            })(config);

            /*prototype*/
            var protoFunc = {};
            for (var prop in config) {
                if (typeof config[prop] == "function") {
                    /*add special wrapper here*/
                    /*if(prop=="render"){
                     var func = config[prop];
                     config[prop] = function(){
                     this.trigger("beforeRender");
                     var render = func();
                     this.trigger("afterRender",render);
                     }
                     }*/
                    protoFunc[prop] = config[prop];
                }
            }
            /* clone prototype */
            var FieldBuilderAbstractClone = $.extend({}, FieldBuilderAbstract);
            FieldRendererConstructor.prototype = $.extend(true, FieldBuilderAbstractClone, protoFunc);

            /* register the constructor */
            _formFields[fieldType] = FieldRendererConstructor;
        }

        var _createForm = function(name, mapConfig) {
            if (typeof name !== "string")
                new Error("createForm: name must be a string");
            if (typeof _formConfig[name] != "undefined"){
                return _formConfig[name];
            }
            _formConfig[name] = new FormBuilder(name, mapConfig);
            _defMap[name] = mapConfig;
            return _formConfig[name];
        }
        /* to fix */
        var _getForm = function(name) {
            if (typeof name !== "string")
                new Error("createForm: name must be a string");
            return _formConfig[name];
        }
        var _getInstance = function(name, newInstance) {

            newInstance = (typeof newInstance =="boolean") ? newInstance : false;

            if(_formConfig.hasOwnProperty('name') && !newInstance){
                return _formConfig[name];
            }

            if (name in _defMap) {
                var form = new FormBuilder(name, _defMap[name]);
                _formConfig[name] = form;
                return form;
            }
        }
        var publicApi = {
            getInstance: function() {
                if (_instance == null) {
                    _instance = new FormManager();
                }
                return _instance;
            },
            createForm: _createForm,
            registerField: _registerField,
            getFormInstance: _getInstance,
            EventManager: {
                on: function() {
                },
                trigger: function() {
                }
            }
        }
        return publicApi;
    })(jQuery, window);

    /** EventHu*/
    FormManager.EventHub = Observable.extend({}, true);

    FormPluginManager = (function() {
        var _pluginsContainer = {};
        var _pluginsInstance = {};
        var _init = function(pluginName, config) {
            try {
                var pluginInstance = new _pluginsContainer[pluginName](config);
                _pluginsInstance[pluginName] = pluginInstance;
            } catch (e) {
                console.log(e);
                throw "Error while loading plugin [" + pluginName + "]";
            }
        }


        var _handlePlugins = function(pluginsConfig) {
            $.each(pluginsConfig, function(key, pluginConf) {
                try {
                    if ("name" in pluginConf) {
                        var config = pluginConf.config || {};
                        _init(pluginConf.name, config);
                    }
                } catch (e) {
                    console.log(e);
                }
            });
        }

        /**
         * L'idée : Récupérer pour le formulaire ou pour le champ concerné
         * var plugin = pluginManager.getPlugin("pluginName",conf);
         * plugin.init({form:"",field:""}).apply();
         * une instance du plugin par formulaire
         **/
        var _createPlugin = function(pluginName, PluginDefinition) {
            var AbstractPlugin = {
                onCreate: function(config) {
                    this.config = config;
                    this.form = null;
                    this.isEnabled = false;
                },
                /* Do what to plugins should do here */
                apply: function() {
                // $(this.field).css("border", "1px solid blue");
                },
                setForm: function(form) {
                    this.form = form;
                },
                hasAttribute: function() {

                },
                init: function() {
                    alert("I'm inside the abstractPlugin");
                },
                canApplyToField: function(fieldSettings) {
                    var result = false;
                    if (this.pluginName in fieldSettings)
                        result = true;
                    return result;
                },
                disable: function() {
                    this.isEnabled = false;
                },
                enable: function() {
                    this.isEnabled = true;
                }

            }

            /* handle properties */
            var _properties = {};
            var _methods = {};
            for (var prop in PluginDefinition) {
                if (typeof PluginDefinition[prop] !== "function") {
                    _properties[prop] = PluginDefinition[prop];
                }
                else {
                    _methods[prop] = PluginDefinition[prop];
                }
            }
            /* add plugin name to prop */
            _properties["pluginName"] = pluginName;

            /**
             * Que se passe-t-il quand on crée un plugin
             * penser à differents types de hooks
             **/
            var PluginConstructor = function(userConfig) {
                /* Keep track of config for each field */
                this.onCreate(userConfig);
                $.extend(true, this, _properties);
                $.extend(true, this._settings, userConfig);
                this.init();
            }
            /* clone Abstract */
            var abstractCopy = $.extend({}, AbstractPlugin);
            PluginConstructor.prototype = $.extend(true, abstractCopy, _methods);
            _pluginsContainer[pluginName] = PluginConstructor;
        }

        return{
            registerPlugin: _createPlugin,
            init: _init,
            handlePlugins: _handlePlugins
        }

    })();


    /*collapsible*/
    FormPluginManager.registerPlugin("collapsible", {
        _settings: {
            fieldTitle: "field-title"

        },
        init: function() {
            this.bindEvents();
        },
        bindEvents: function() {
            FormManager.EventHub.on("renderField", $.proxy(this.handleFieldRender, this));
        },
        _bindcollapsibleEvents: function(field) {
            try {
                var fieldLabel = field.getLabelField();
                if (!fieldLabel)
                    return;
                var mainFieldLabel = field.getMainField();
                $(fieldLabel).on("click", function() {
                    var btn = $(this).find(".collapsible-btn");
                    if ($(btn).hasClass("fa-angle-down")) {
                        $(btn).removeClass("fa-angle-down").addClass("fa-angle-right");

                        $(mainFieldLabel).hide();
                        $(fieldLabel).css("borderBottom", "1px solid #95A5A6");
                    } else {
                        $(btn).removeClass("fa-angle-right").addClass("fa-angle-down");
                        $(mainFieldLabel).show();
                        $(fieldLabel).css("borderBottom", "");
                    }
                });
            } catch (e) {
                console.log(e);
            }

        },
        handleFieldRender: function(data) {
            if (!this.canApplyToField(data.field.getSettings()))
                return;
            this._bindcollapsibleEvents(data.field);
            var collapsibleBtn = $("<i class='collapsible-btn fa fa-angle-down'></i>").clone();
            $(collapsibleBtn).css({
                "display": "inline-block",
                "width": "10px",
                marginRight: "2px"
            });
            $(data.itemRender).find(".field-title").prepend(collapsibleBtn);
        }

    });


    /* dynfield plugin */
    FormPluginManager.registerPlugin("dynfield", {
        _settings: {
            showNumber: true
        },
        _fieldsInfos: {}, /* form fieldname value */

        init: function() {
            var plugin = this;
            FormManager.registerField("dynfield", {
                init: function() {
                    this.field = document.createDocumentFragment();
                    this.minEntry = 1; //extends settings
                    this.maxEntry = 4; //extends settings
                    this.cmpt = 0;
                    this.defaultFieldSettings = {};
                    this.plugin = plugin;
                    var self = this;
                    this.fields = new Kimo.SmartList({
                        idKey: "id",
                        onChange: function() {
                            self.cmpt = this.getSize();
                        },
                        onDelete: function() {
                            self.cmpt = this.getSize();
                        }
                    })
                    this.createDefaultField();
                    FormManager.EventHub.on("processFormData", $.proxy(this.handleFormData, this, this.getName()));
                },
                handleFormData: function(fieldName, event) {
                    event.formData[fieldName] = this.getValue(fieldName);
                },
                getLabelField: function() {
                    return null;
                },
                createDefaultField: function() {
                    this.defaultFieldSettings = $.extend(true, {}, this._settings);
                    this.defaultFieldSettings.value = "";
                    this.defaultFieldSettings.type = this.defaultFieldSettings.originalType;
                },
                _updateFieldControls: function() {
                    var self = this;
                    var size = this.fields.getSize();
                    $.each(this.fields.getData(true), function(i, fieldInfos) {
                        if (size >= self.maxEntry) {
                            $(fieldInfos.field).find(".addBtn").hide();
                        }

                        if (size < self.maxEntry) {
                            $(fieldInfos.field).find(".addBtn").show();
                        }
                    });
                },
                /**
                 *when field is appended
                 **/
                _appendField: function(btn, fieldSettings) {
                    fieldSettings = fieldSettings || this.defaultFieldSettings;
                    var item = this._settings.form.appendField(fieldSettings);
                    var fieldKey = Utils.generateId("field");
                    var itemRender = this._attachControl(fieldKey, item.render());
                    itemRender.addClass("dynfield");
                    this.fields.set(fieldKey, item);
                    //$(btn).attr("field-key",fieldKey);
                    if (btn) {
                        $(btn).parents(".dynfield").after($(itemRender).get(0));
                    }
                    else {
                        this.field.appendChild($(itemRender).get(0));
                    }
                    this._updateFieldControls();
                },
                bindEvents: function(btn) {
                    var self = this;
                    $(btn).on("click", ".formBtn", function(e) {
                        var btnWrapper = e.delegateTarget;
                        if ($(this).hasClass("addBtn")) {
                            if (self.cmpt >= self.maxEntry) {
                                self.cmpt = self.maxEntry;
                                return;
                            }
                            self._appendField(btn);
                        }
                        else {
                            /** erase */
                            if ((self.cmpt < self.minEntry) || (self.cmpt == 1)) {
                                self.cmpt = self.minEntry;
                                return;
                            }
                            var fieldKey = $(btnWrapper).data("field-key");
                            $(self.fields.get(fieldKey).field).remove();
                            self.fields.deleteItemById(fieldKey);
                            self._updateFieldControls();
                        }
                    });
                },
                /**
                 * Afficher les boutons après
                 **/
                _attachControl: function(fieldKey, field) {
                    var actionBtn = $("<span class='pull-right'><i class='fa fa-plus-circle fa-1 formBtn addBtn'></i> <i class='fa fa-minus-circle formBtn rmvBtn'></i></span>").clone();
                    $(actionBtn).data("field-key", fieldKey);
                    $(field).append($(actionBtn).get(0));
                    this.bindEvents(actionBtn);
                    return field;
                },
                populate: function() {

                    var self = this;
                    var values = this._settings.value;

                    if ($.isPlainObject(values)) {
                        $.each(values, function(i, fieldValue) {
                            var key = self.getName() + "_" + i;
                            var newSettings = $.extend(true, {}, self._settings);
                            newSettings.value = fieldValue;
                            newSettings.type = self._settings.originalType;
                            self._appendField(null, newSettings);
                        });
                    }
                    else {
                        /*single or empty element*/
                        var newSettings = $.extend(true, {}, self._settings);
                        newSettings.type = self._settings.originalType;
                        self._appendField(null, newSettings);
                    }
                },
                getValue: function(fieldName) {
                    var result = {}; //fix value here add keyname key type
                    var self = this;
                    var data = this.fields.getData(true);
                    var cpt = 0;
                    $.each(data, function(i, field) {
                        cpt = cpt + 1;
                        var key = fieldName + "_" + cpt;
                        result[key] = field.getValue();
                    });
                    this.setValue(result);
                    return result;
                },
                render: function() {
                    return this.field;
                }

            });
            this.bindEvents();

        },
        appendField: function(config, ctn) {
            var fieldInfos = {};
            fieldInfos.key = "";
            fieldInfos.field = "";
            var field = config.form.appendField(config);
            $(ctn).before($(field.render()));
        },
        bindEvents: function() {
            FormManager.EventHub.on("processFieldMap", $.proxy(this.processFieldsMap, this));
        },
        processFieldsMap: function(event) {
            /* Handle dyn form */
            $.each(event.fieldMap, function(fieldName, fieldInfos) {
                if ("dynfield" in fieldInfos) {
                    fieldInfos.originalType = fieldInfos.type;
                    fieldInfos.type = "dynfield";
                    fieldInfos.value = event.form.data.get(fieldName);
                    fieldInfos.form = event.form;
                }

            });
        },
        /**
         * Before the field render
         **/
        beforeRenderField: function(event) {
        },
        /*handle form data or register some sort of me raw/json*/
        handleFormData: function(event) {
            /**the idea: form Render do it job as usual
             * the plugin knows how to handle data for each field
             **/
            var formName = event.formName;
            this._setFieldData(formName, event.formData);
        },
        _setFieldData: function(form, data) {
            console.log("data", data);
        },
        handleFormRender: function() {
        }

    });



    /*use template and template key
     * bootstap
     * handle donnée
     *  get Template from a template container
     *  handle template key
     *  use a template file [] defined by default <data-text-template='text'/>
     **/
    FormManager.registerField("text", {
        _settings: {
            templateKey: "sqljdh",
            fieldName: "",
            label: "###your_label###",
            placeholder: ""
        },

        /* explicit init */
        init: function() {
            this.field = $("<p><label class='field-title'></label><input class=\"mainField input-block-level\" type=\"text\"/></p>").clone();
            $(this.field).attr("data-field-id",this.id);
            $(this.field).find(".field-title").text(this._settings.label);
            if ("placeholder" in this._settings && typeof this._settings.placeholder == "string") {
                $(this.field).find("input").attr("placeholder", this._settings.placeholder).val("toto");
            }
            this.field.find("input").attr("id","field_"+this.id);
            this._bindEvents();
        },

        _bindEvents: function() {
            $(this.mainFormWrapper).delegate("#field_"+this.id,"blur",$.proxy(this._handleChange,this));
        //$(this.mainFormWrapper)
        },
        getMainField: function() {
            return this.field.find("input").eq(0);
        },
        getLabelField: function() {
            return this.field.find("label.field-title").eq(0);
        },
        _handleChange: function(e) {
            var value = $(e.currentTarget).val();
            this.setValue(value);
        },
        populate: function() {
            var fieldName = (this._settings.entityName) ? "data-fieldname-" + this._settings.entityName : "data-fieldname";
            $(this.field).find("#field_"+this.id).eq(0)
            .attr("name", this._fieldName)
            .attr(fieldName, this._settings.fieldName)
            .attr("value",this._settings.value);
        },
        render: function() {
            return this.field;
        },
        validate: function() {
            return true;
        }
    });



    FormManager.registerField("password", {
        _settings: {
            templateKey: "sqljdh",
            fieldName: "",
            label: "###your_label###",
            placeholder: ""
        },
        /*events change, validity change, dirtychange -->from extjs*/
        /* init value : initValue, isDirty, reset, handle events */
        /*main concern how to handle form change*/
        /*explicit init*/
        init: function() {
            this.field = $("<p><label class='field-title'>This is</label><input class=\"mainField input-block-level\" type=\"password\"/></p>").clone();
            $(this.field).find(".field-title").text(this._settings.label);
            if ("placeholder" in this._settings && typeof this._settings.placeholder == "string") {
                $(this.field).find("input").attr("placeholder", this._settings.placeholder);
            }
            this._bindEvents();
        },
        _bindEvents: function() {
            this.field.delegate("input", "blur", $.proxy(this._handleChange, this));
        },
        getMainField: function() {
            return this.field.find("input").eq(0);
        },
        getLabelField: function() {
            return this.field.find("label.field-title").eq(0);
        },
        _handleChange: function(e) {
            var value = $(e.target).val();
            this.setValue(value);
        },
        populate: function() {
            var fieldName = (this._settings.entityName) ? "data-fieldname-" + this._settings.entityName : "data-fieldname";
            $(this.field).find("input").eq(0)
            .attr("name", this._fieldName)
            .attr(fieldName, this._settings.fieldName).val(this._settings.value);
        },
        render: function() {
            return this.field;
        },
        validate: function() {
            return true;
        }
    });
    /************ SELECT ************/
    FormManager.registerField("list", {
        _settings: {},
        events: ["change"],
        init: function() {
            this.field = $("<p><label class='field-title'></label><content></content></p>").clone();
            this.field.find("label.field-title").text(this._settings.label);
            this.renderType = this._settings.renderType;
            this.value = ($.isArray(this._settings.value)) ? this._settings.value : [this._settings.value];
            this.value = (!isNaN(parseInt(this.value[0]))) ? [parseInt(this.value[0])] : this.value;
            this._bindEvents();
        },
        _bindEvents: function() {
            this.field.delegate("select,input", "change", $.proxy(this._handleChange, this));
        },
        getLabelField: function() {
            return this.field.find("label.field-title").eq(0);
        },
        _handleChange: function(e) {
            var value = [];
            var attrToCheck = (this.renderType == "select") ? "selected" : "checked";
            var selected = this.field.find(":" + attrToCheck);
            $.each(selected, function() {
                value.push($(this).val());
            });
            this.notify("change", {
                value: value[0]
            });
            this.setValue(value[0]);
        },
        populate: function() {
            var content = "";
            if (this.renderType == "select") {
                content = this.populate_select();
            }
            if (this.renderType == "checkbox") {
                content = this.populate_checkbox();
            }
            if (this.renderType == "radio") {
                content = this.populate_radio();
            }
            this.field.find("content").replaceWith($(content));
        },
        populate_radio: function() {
            var self = this;
            var radioCtn = document.createDocumentFragment();
            var isArray = ($.isArray(this._settings.dataSource)) ? true : false;
            $.each(this._settings.dataSource, function(i, data) {
                var value = (isArray) ? data : i;
                var tmpl = $("<input/>");
                var wrapper = $("<label/>");
                $(wrapper).addClass("radio inline");
                $(wrapper).text(data);
                //$(tmpl).attr("name","test");
                $(tmpl).attr("type", "radio");
                $(tmpl).val(value);
                if ($.inArray(value, self.value) != -1) {
                    $(tmpl).attr("checked", "checked");
                }
                $(wrapper).append(tmpl);
                radioCtn.appendChild(wrapper.get(0));
            });
            return radioCtn;

        },
        populate_select: function() {
            var self = this;
            var options = document.createDocumentFragment();
            var isArray = ($.isArray(this._settings.dataSource)) ? true : false;
            $.each(this._settings.dataSource, function(i, data) {
                /*Ajouter test type ici*/
                var value = (isArray) ? data : i;
                var tmpl = $("<option/>");
                $(tmpl).val(value).text(data);
                options.appendChild(tmpl.get(0));
                if ($.inArray(value, self.value) != -1) {
                    $(tmpl).attr("selected", "selected");
                }
            });
            var container = $("<select/>");
            $(container).append($(options));
            return container;
        },
        populate_checkbox: function() {
            var self = this;
            var checkboxeCtn = document.createDocumentFragment();
            var isArray = ($.isArray(this._settings.dataSource)) ? true : false;
            $.each(this._settings.dataSource, function(i, data) {
                var value = (isArray) ? data : i;
                var tmpl = $("<input/>");
                var wrapper = $("<label/>");
                $(wrapper).text(data);
                $(wrapper).addClass("checkbox inline");
                //$(tmpl).attr("name","test"); modifier le nom
                $(tmpl).attr("type", "checkbox");
                $(tmpl).val(value);
                if ($.inArray(value, self.value) != -1) {
                    $(tmpl).attr("checked", "checked");
                }
                $(wrapper).append(tmpl);
                checkboxeCtn.appendChild(wrapper.get(0));
            });
            return checkboxeCtn;
        },
        render: function() {
            return this.field;
        }
    });

    /*************TEXTAREA********************/
    FormManager.registerField("textarea", {
        _settings: {},
        init: function() {
            this.field = $("<p><label class='field-title'></label><textarea></textarea></p>").clone();
            this.field.find("label.field-title").text(this._settings.label);
            this.field.find("textarea").addClass("input-block-level");
            if ("placeholder" in this._settings && typeof this._settings.placeholder == "string") {
                (this.field).find("textarea").attr("placeholder", this._settings.placeholder);
            }
            if (this._settings.hasOwnProperty("id")) {
                $(this.field).attr("id", this._settings.id);
            }
            this._bindEvents();
        },
        getMainField: function() {
            return this.field.find("textarea").eq(0);
        },
        getLabelField: function() {
            return this.field.find("label.field-title").eq(0);
        },
        _bindEvents: function() {
            this.field.delegate("textarea", "blur", $.proxy(this._handleChange, this));
        },
        _handleChange: function(e) {
            var value = $(e.target).val();
            this.setValue(value);
        },
        populate: function() {
            var fieldName = (this._settings.entityName) ? "data-fieldname-" + this._settings.entityName : "data-fieldname";
            $(this.field).find("textarea").eq(0)
            .attr("name", this._fieldName)
            .attr(fieldName, this._settings.fieldName).val(this._settings.value);
        },
        render: function() {
            return this.field;
        }

    });

    /**************RICH-TEXTAREA rte:aloha-cke-markdown****************/
    FormManager.registerField("richtextarea", {
        _settings: {}

    });


    /**********DATALIST***************/
    /**
     * Datalist allows autocompletion
     * multiple selection
     * custom item render
     *
     *
     */
    FormManager.registerField("datalist", {
        _settings: {
            datalistCls: "datalist-item"
        },
        init: function() {
            this.field = $("<div><label class='field-title'></label><div class='selectionsContainer'></div><input type='text'/><content></content></div>").clone();
            this.field.find("label.field-title").text(this._settings.label);
            this.inputField = this.field.find("input").eq(0);
            this.field.find("input").attr("placeholder", this._settings.placeholder);
            this.selectionContainer = $(this.field).find(".selectionsContainer").eq(0);
            this._settings.enableMultipleSelection = (this._settings.enableMultipleSelection === true) ? true : false;
            if (this._settings.enableMultipleSelection) {
                this._selected = [];
            }
            this._selected = null;
            this._bindEvents();

            this._itemRenderer = (typeof this._settings.itemRenderer === "function") ? this._settings.itemRenderer : function() {
                console.log(" an itemRender must be provided.");
            };
            this._itemSelectedRender = (typeof this._settings._itemSelectedRender === "function") ? this._settings._itemSelectedRender : function(selectedData, selectedContent) {
                return $(selectedContent);
            }
        },
        _bindEvents: function() {
            var self = this;
            this.field.delegate("input", "keyup", $.proxy(this._handleChange, this));
            this.field.delegate("." + this._settings.datalistCls, "click", function(e) {
                var contentRender = e.currentTarget;
                var selectedContent = self._settings._dataSource[$(this).attr("data-key")];
                self._handeSelection(selectedContent, contentRender);
            });
            this.field.delegate(".selectedContent", "click", $.proxy(this._showSelectAction, this));
        },
        _showSelectAction: function(e) {
            var selected = e.currentTarget;
            $(selected).remove();
            this.inputField.val("");
            this.inputField.show();
        },
        /**
         *si plusieurs Selection placer avant
         *sinon remplacer le champ de recherche par la selection
         **/
        _handeSelection: function(selectedContent, contentRender) {
            var selectedRender = this._itemSelectedRender(selectedContent, contentRender);
            if (selectedRender) {
                $(selectedRender).addClass("selectedContent");
                if (this._settings.enableMultipleSelection) {
                /*add before*/
                } else {
                    /*hide input field*/
                    $(this.selectionContainer).html($(selectedRender));
                    $(this.inputField).hide();
                    $(this.field).find(".data-container").hide();
                    this._selected = selectedContent;
                }
            }
            this.setValue(this._selected);
        },
        _handleChange: function(e) {
            var content = $(e.target).val();
            var self = this;
            var searcher = this._settings.searchHandler.call(this, content);
            searcher.done(function(response) {
                self.contentWrapper.hide();
                self._showResults(response.items);
                self._settings._dataSource = response.items;
            });
        },

        _showResults: function(contents) {
            var self = this;
            var container = document.createDocumentFragment();
            if ($.isArray(contents) && contents.length) {
                for (key in contents) {
                    var render = self._itemRenderer(contents[key]);
                    $(render).attr("data-key", key);
                    $(render).addClass(this._settings.datalistCls);
                    container.appendChild($(render).get(0));
                }
            }
            if (container) {
                $(this.field).find(".data-container").show();
                this.contentWrapper.html($(container));
                this.contentWrapper.show();
            }
        },
        _seachContent: function() {
        },
        setSelection: function() {
        },
        populate: function() {
            var contentWrapper = $("<div/>");
            $(contentWrapper).css({
                height: "200px",
                overflow: "auto",
                marginTop: "2px",
                border: "1px solid lightgray"
            }).addClass("data-container");
            $(contentWrapper).hide();
            this.inputField.after(contentWrapper);
            this.contentWrapper = contentWrapper;
        },
        render: function() {
            return this.field;
        }
    });

    /*form collection first attemp*/
    FormManager.registerField("form-choice", {
        _settings: {},
        init: function() {
            this.field = $("<div><div class='forms-container'></div><a href='javascript:;' class='add-btn'><i class='fa fa-plus-square'></i> Ajouter un contenu</a></div>").clone();
            this._bindEvents();
            this._currentForm = null;
            this.formsContainer = {};
            this.formCpt = 0;
            var formChooser = (typeof this._settings.chooserRenderer == "function") ? this._settings.chooserRenderer : false;
            this.formList = formChooser();
            this.beforeSubFormRender = (typeof this._settings.beforeSubFormRender == "function") ? this._settings.beforeSubFormRender : null;
            this.onDeleteSubForm = (typeof this._settings.onDeleteSubform == "function") ? this._settings.onDeleteSubform : null;
            this.addBtn = $(this.field).find(".add-btn").eq(0);
            this.useJsonData = (typeof this._settings.useJsonData == "boolean") ? this._settings.useJsonData : false;
        },
        _bindEvents: function() {
            $(this.field).delegate(".add-btn", "click", $.proxy(this._handleNewForm, this));
            this.field.delegate(".form-choice-item", "mouseenter", $.proxy(this._showFormActions, this));
            this.field.delegate(".form-choice-item", "mouseleave", $.proxy(this._removeFormActions, this));
            this.field.delegate(".del-btn", "click", $.proxy(this._removeForm, this));
            this.field.delegate(".form-chooser-btn", "click", $.proxy(this._chooseForm, this));
        },
        _removeForm: function() {
            if (confirm("Are you sure?")) {
                var formNo = $(this._currentForm).data("form-no");
                $(this._currentForm).remove();
                var form = this.formsContainer["form_" + formNo];
                this.onDeleteSubForm(form.getData());
                delete(this.formsContainer["form_" + formNo]);
                this.formCpt = this.formCpt - 1;
            }
        },
        _handleNewForm: function(e) {
            var btn = e.target;
            $(btn).hide();
            $(btn).after($(this.formList));
        },
        _chooseForm: function(e) {
            var link = e.currentTarget;
            var formName = $(link).attr("data-form");
            if (typeof formName == "string") {
                this._addNewForm(formName);
            }
        },
        _removeFormActions: function(e) {
            this.field.find(".action-ctn").remove();
            var currentTarget = e.currentTarget;
            $(currentTarget).removeClass("editing");
            var formNo = $(currentTarget).data("form-no");
            var form = this.formsContainer["form_" + formNo];
            this.getValue();
        },
        _showFormActions: function(e) {
            var form = e.currentTarget;
            if (this._settings.deletable) {
                var action = "<div class='action-ctn'><a href='javascript:;' class='del-btn'><i class='fa fa-trash-o'></i> Effacer</a></div>";
                $(form).css({
                    position: "relative"
                });
                this._currentForm = form;
                $(form).addClass("editing");
                $(action).css({
                    position: "absolute",
                    right: "5px",
                    "top": "-7px"
                }).appendTo(this._currentForm);
            }

        },
        _addNewForm: function(formType, data) {
            if (typeof formType != "string")
                return;
            data = (data) ? data : {};
            var form = FormManager.getFormInstance(formType, true);
            if (typeof this.beforeSubFormRender == "function") {
                this.beforeSubFormRender(form, data);
            } else {
                form.setData(data); //strange
            }
            var formRender = form.render();
            var subFormWrapper = $("<div/>").addClass("kimo deletable form-choice-item");
            $(subFormWrapper).attr("data-form-type", formType);
            $(subFormWrapper).append($(formRender));
            $(subFormWrapper).data("form-no", this.formCpt);
            this.field.find(".forms-container").append(subFormWrapper);
            this.formsContainer["form_" + this.formCpt] = form;
            this.formCpt++;
        },
        getSubForms: function() {
            return this.formsContainer;
        },
        getValue: function(raw) {
            raw = raw || false;
            var value = {};
            $.each(this.formsContainer, function(i, form) {
                value[i] = {};
                value[i].type = form.name;
                value[i].data = form.getData(raw);
            });
            this.setValue(value);
            return value;
        },
        populate: function() {
            this.formCpt = 0;
            var formValue = this._settings.value;
            console.log(formValue);
            var self = this;
            $.each(formValue, function(key, formData) {
                /* test type && data */
                self._addNewForm(formData.type, formData.data);
            });
        },
        render: function() {
            return $(this.field);
        }
    });

    /*créer un champ image*/
    FormManager.registerField("image", {
        dependencies: [],
        _settings: {
            id: "",
            uploadPath: ""
        },
        events: ["progress","error","complete"],
        init: function() {
            this.field = $('<div>'
                + ' <label class="field-title"></label>'
                + ' <div class="contentWrapper">'
                + ' <form action="" id=""></form>'
                + ' </div>').clone();
            this.field.find("label.field-title").text(this._settings.label);
            this.field.find("form").attr("id",this._settings.id);
            this.mainForm = this.field.find("#"+this._settings.id);
            $(this.mainForm).attr("action",this._settings.config.url);
            Dropzone.autoDiscover = false
            this.initFormUpload();
        },

        initFormUpload: function() {
            var self = this;
            $(this.mainForm).addClass("dropzone");
            this.dropZone = $(this.mainForm).dropzone({
                url: this._settings.config.url,
                paramName : this._settings.config.paramName,
                maxFiles: 1,
                init: function(){
                    this.on("addFile", function(file){
                        console.log("file",file)
                    });
                    this.on("success", function(){
                        console.log("success")
                    });
                },
                acceptedFiles: "image/*",
                addRemoveLinks : true,
                accept: function(file,done){
                    self.file = file;
                    done();
                },
                success: function(e){
                    $(".data-dz-name").remove();
                    $(".dz-filename").remove();
                    $(".dz-size").remove();
                    $(".dz-success-mark").remove();
                    $(".dz-error-mark").remove();
                    self.trigger("onSuccess");
                    console.log("this is it",e);
                }
            });
            console.log(this.dropZone);
        },


        getMainField: function() {
            return $(this.field).find(".contentWrapper").eq(0);
        },

        getValue: function() {
            /*renvoie le nom de/des fichiers uploadés*/
            var files = this.dropZone.getAcceptedFiles();
            console.log(files);
            return result;
        },
        populate: function() {
        },
        render: function() {
            return $(this.field);
        }


    });

    /*céer hidden type*/

    //var template = FormRenderer.getRenderer(templateToUse).parse(this.fieldType,data);
    FormRenderer = (function() {
        var _renderers = {};

        var AbstractRenderer = {
            _initialize: function() {
                this._settings = {};
                this.mainWrapper = null;
                this.templateEngine = null;
                if (typeof this._init == "function") {
                    this._init();
                }
            },
            parse: function(fileType, data) {
                try {
                    var rendererFunc = "renderer_" + fileType;
                    if (!typeof renderer == "string" || typeof this.renderers[rendererFunc] != "function")
                        throw "No template was found for " + fileType + " type";
                    return this[rendererFunc](data);
                } catch (e) {
                    console.warn(e);
                }
            }
        }

        var _getRenderer = function(templateName) {
            if (!_renderers[templateName])
                throw "Renderer " + templateName + " can't be found";
            return _renderers[templateName];
        }

        var _createRenderer = function(templateName, rendererConfig) {
            var properties = {};
            var methods = {};
            /* clean object def */
            $.each(rendererConfig, function(key, value) {
                if (typeof value == "function") {
                    methods[key] = value;
                } else {
                    properties[key] = value;
                }
            });

            /*all methods go to prototype*/
            var FieldTemplateConstructor = function(userSettings) {
                $.extend(true, this, properties);
                $.extend(true, this._settings, userSettings); //extends default setting by user settings
                this._initialize();
            }
            /*traiter methodes spéciales ici*/
            /*extends here*/
            var AbstractClone = $.extend(true, {}, AbstractRenderer);
            FieldTemplateConstructor.prototype = $.extend(true, AbstractClone, methods);
            _renderers[templateName] = FieldTemplateConstructor;
        }

        return {
            getRenderer: _getRenderer,
            createTemplate: _createRenderer
        }
    })();
    FormManager.FormRenderer = FormRenderer;

    /*show renderer trigger events?*/
    FormManager.FormRenderer.createTemplate("simple", {
        _init: function() {
            this.markup = "";
            this.wrapper = "<div class='mainWrapper'></div>"
        },
        /* maybe useful */
        render_form: function(data) {
            return "<div class='first_class'></div>";
        },
        render_text: function(data) {
            var tpl = "<p> radical blaze ${label}</p><p>${input}</p>";
            return tpl;
        },
        render_textarea: function(data) {
            var tpl = "<div><p>${label}</p><div>${textarea}</div></div>"
        }
    });

    Kimo.FormManager = FormManager;
    return FormManager;
});


