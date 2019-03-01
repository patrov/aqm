define([], function () {

    var normalizeName = function (name) {
        var pos = name.search('Activity'),
            activityName = name.substring(0, pos);
            return activityName.toLowerCase()+"."+"activity";
    };

    return {
        load: function (managerName, req, onload, config) {
            var infos = managerName.split(":"),
                    managerName;
                if (infos.length!==2) {
                    onload.error("managerName is not valid! [app:manager] format is expected. ["+managerName+"] was provided.");
                }
                managerName = infos[1].toLowerCase()+".manager.js";
                fullPath = config.baseUrl + 'apps/' + infos[0].toLowerCase() +'/managers/'+ managerName;
            req([fullPath], function (manager) {
                onload(manager);
            }, function (reason) {
                console.log(reason);
                onload.error(reason);
            });
        }
    };


});