define(['Kimo.Iterator', 'jquery'], function (Iterator, jQuery) {

    var TaskQueue = function () {

        var settings = {
            tick : 800,
            processingHandler : jQuery.noop
        };

        TaskQueue.prototype.init = function (userSettings) {
            this.settings = jQuery.extend(true, settings, userSettings);
            this.tasksList = [];
            this.tick = this.settings.tick;
            this.intervalID = null;
            this.isProcessing = false;
            this.processingHandler = ( typeof this.settings.processingHandler === "function" ) ? this.settings.processingHandler : function () {
                throw "ProcessingHandlerException: A processingHandler";
            }
            this.init = null;
        }


        if (typeof this.add !== 'function') {
            TaskQueue.prototype.add = function (task) {
                this.tasksList.push(task);
            }
        }

        TaskQueue.prototype.removeTask = function (task) {}

        TaskQueue.prototype.process = function () {
            if (this.isProcessing) {
                return false;
            }
            this.isProcessing = true; 
            var iterator = Iterator.create(this.tasksList);
            this.intervalID = setInterval(function () {
                try {
                    if (iterator.hasNext()) {
                        this.processingHandler(iterator.next());
                    }
                } catch(e) {
                    throw "ProcessException: " + e;
                }

            }.bind(this), this.tick);
        }

        TaskQueue.prototype.stop = function () {
            clearInterval(this.intervalID);
        }

        this.init.apply(this, arguments);
    }

    return {

        create : function (settings) {
            var settings = settings || {};
            return new TaskQueue(settings);
        },

        instance : TaskQueue
    }

});
