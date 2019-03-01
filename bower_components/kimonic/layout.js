define([], function () {
    /*read config from Kimo.Config App instance config*/
    var normalizeName = function (name) {
        var pathInfos = name.split('.'),
            pos = pathInfos[1].search('Activity'),
            activityName = pathInfos[1].substring(0, pos);
            return pathInfos[0].toLowerCase()+'/layouts/'+activityName.toLowerCase()+'.'+pathInfos[2]+".html";
    };
    
    return {

        load: function (layoutKey, req, onload, config) {
                  if(layoutKey === 'no-layout') {
                      return onload(null);
                  }
				  
                var layoutPath = normalizeName(layoutKey),
                    fullPath = 'text!' + config.baseUrl + 'apps/' + layoutPath;            
            req([fullPath], function (template) {
                onload(template);
            }, function (reason) {
                onload.error(reason);
            });
        }
    };




});