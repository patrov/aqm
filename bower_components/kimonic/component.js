/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

define([], function () {

    var parseComponentName = function (componentName) {
        var componentInfos = componentName.split(':');
        return componentInfos;
    };

    return {
        load: function (componentName, req, onload, config) {
             var componentInfos = parseComponentName(componentName),
                 fullPath = config.baseUrl + 'apps/' + componentInfos[0].toLowerCase() + '/components/' + componentInfos[1] + '/main.js';
              req([fullPath], function (component) {
                  onload(component);
                  
              }, function (reason) {
                  onload.error(reason);
              });
        }
    }

});
