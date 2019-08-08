/**
 * Local cross-origin bridge, host side
 * 
 * @author meps
 */

(function() {
    'use strict';

    var channelHost = 'CORSBridgeHost#';
    var channelClients = 'CORSBridgeClient#';

    /**
     * Client request holder
     */
    function BridgeHostRequest(guid, tag, queueAppender) {
        var completed = false;
        
        return {

            /**
             * Client identifier
             */
            tag: function() {
                return tag;
            },

            /**
             * Send update with request processing state
             * 
             * @param {*=} state current progress statement
             */
            progress: function(state) {
                if (completed) {
                    throw new Error('Cannot apply to completed request');
                }
                
                queueAppender({
                    guid: guid,
                    ts: Date.now(),
                    type: 'progress',
                    data: state
                });
            },

            /**
             * Complete request 
             * 
             * @param {object=} error error statement
             * @param {*...} args arguments of successful response
             */
            response: function(error) {
                if (completed) {
                    throw new Error('Cannot apply to completed request');
                }

                completed = true;
                if (error) {
                    queueAppender({
                        guid: guid,
                        ts: Date.now(),
                        type: 'error',
                        data: error
                    });
                } else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    queueAppender({
                        guid: guid,
                        ts: Date.now(),
                        type: 'response',
                        data: args
                    });
                }
            }
        }
    }

    /**
     * Host bridge
     */
    function BridgeHost() {
        var eventQueue = [];
        var requestHandlers = {};
        var requestQueue = [];
        var responseQueue = [];

        var root = window;
        while (root !== root.parent) {
            root = root.parent;
        }

        if (window.addEventListener) {
            window.addEventListener('message', onMessage);
        } else {
            window.attachEvent('onmessage', onMessage); // IE 8
        }

        function onMessage(event) {
            var data = event.data;
            if (data.indexOf(channelClients) !== 0) return;

            data = data.substr(channelClients.length);
            var messages = JSON.parse(data);
            requestQueue = requestQueue.concat(messages);
            processRequests();
        }

        function processRequests() {
            if (!requestQueue) return;

            var requests = requestQueue.concat();
            requestQueue = [];
            for (var i = 0; i < requests.length; ++i) {
                var request = requests[i];
                var handler = requestHandlers[request.command];
                if (!handler) continue;

                var holder = BridgeHostRequest(request.guid, request.tag, appendReponse);
                var data = request.data;
                if (data) {
                    handler.apply(null, [holder].concat(data));
                } else {
                    handler(holder);
                }
                
            }
        }

        function processEvents() {
            if (!eventQueue) return;

            var events = eventQueue.concat();
            eventQueue = [];
            sendMessages(events);
        }

        function sendMessages(messages) {
            var data = channelHost + JSON.stringify(messages);
            var targets = collectTargets(root);
            for (var i = 0; i < targets.length; ++i) {
                var target = targets[i];
                target.postMessage(data, '*');
            }
        }

        function collectTargets(from) {
            var collected = [from];
            for (var i = 0; i < collected.length; ++i) {
                var target = collected[i];
                var targets = Array.prototype.slice.call(target.frames);
                collected = collected.concat(targets);
            }
            return collected;
        }

        function appendReponse(message) {
            responseQueue.push(message);
            processResponses();
        }

        function processResponses() {
            if (!responseQueue) return;

            var responses = responseQueue.concat();
            responseQueue = [];
            sendMessages(responses);
        }

        return {

            /**
             * Send event to all active clients
             * 
             * @param {string} command event type
             * @param {*=} data event payload
             */
            dispatch: function(command, data) {
                var event = {
                    ts: Date.now(),
                    command: command + ''
                };
                if (data !== undefined) event.data = data;
                eventQueue.push(event);
                processEvents();
            },

            /**
             * Client request callback
             * 
             * @callback BridgeCallbackRequest
             * @param {BridgeHostRequest} request request holder
             * @param {*...} args request arguments
             */

            /**
             * Sign to clients requests
             * 
             * @param {string} command request type
             * @param {BridgeCallbackRequest} handler request handler
             */
            onrequest: function(command, handler) {
                if (handler) {
                    requestHandlers[command] = handler;
                } else {
                    delete requestHandlers[command];
                }
            }

        }
    }

    if (typeof window.BridgeHost === 'undefined') window.BridgeHost = BridgeHost();
})();
