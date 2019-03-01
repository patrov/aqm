define(['vendor.handlebars'], function (HandleBars) {
   var TemplateManager = {
        error: "Error while loading the template",
        render: function (path, params) {
            var self = this,
                params = params || {},
                placeHolder = params.placeHolder || $("<div>Loading...</div>"),
                renderCallback = (typeof params.onRender === "function") ? params.onRender : function () {}


            require(["text!" + path], function(tpl) {
                if (typeof params.dataLoader === "function") {
                    params.dataLoader().done(function(data){
                        params.data = data;
                        self.renderer(tpl, placeHolder, params);
                        renderCallback(placeHolder);
                    }).fail(function () {
                        $(placeHolder).html(self.error + " "+path);
                    });
                }else{
                    self.renderer(tpl, placeHolder, params);
                    renderCallback(placeHolder);
                }
            }, function(){
                self.errorRenderer(placeHolder, path);
            });
            return placeHolder;
        },

        renderer: function(tpl, placeHolder, params){
            tpl = HandleBars.compile(tpl);
            var html = tpl(params.data);
            var action = params.renderAction || "html";
            $(placeHolder)[action](html);
        },

        errorRenderer: function(placeHolder, path) {
            $(placeHolder).html(this.error+" "+path);
        }
    };
    Kimo.TemplateManager = TemplateManager;
    return TemplateManager;
});


