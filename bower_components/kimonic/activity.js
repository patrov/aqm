define([], function () {

    var normalizeName = function (name) {
        var pos = name.search('Activity'),
            activityName = name.substring(0, pos);
            return activityName.toLowerCase()+"."+"activity";
    };

    return {
        load: function (ActivityName, req, onload, config) {
            var infos = ActivityName.split(":"),
                activityname = normalizeName(infos[1]),
                fullPath = config.baseUrl + 'apps/' + infos[0].toLowerCase() +'/activities/'+ activityname+'.js';
            req([fullPath], function () {
                onload({path: infos[0].toLowerCase()+'/activities/'+activityname+'.js'});
            }, function (reason) {
                console.log("reason", reason);
                onload.error(reason);
            });
        }
    };
});