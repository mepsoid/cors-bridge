/**
 * Local cross-origin bridge, client side
 * 
 * @author meps
 */

(function() {
    'use strict';

    var channelHost = 'CORSBridgeHost';
    var channelClients = 'CORSBridgeClient';
    var channelId = 'cors_bridge_channel';

    /**
     * Client bridge setup options
     * 
     * @typedef {object} BridgeOptions
     * @property {*=} tag client identifier for debugging
     * @property {*=} domain working domain identifier
     */

    /**
     * Client bridge
     * 
     * @param {BridgeOptions=} options initial setup options
     */
    function BridgeClient(options) {
        var tag = options.tag;
        var domain = options.domain;
        var eventHandlers = {};
        var eventQueue = [];
        var requestQueue = [];
        var requestCallbacks = {};
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
            if (typeof(data) !== 'object') return;
            if (data[channelId] !== channelHost) return;
            if (!domain && data.domain !== domain) return;

            var messages = data.messages;
            for (var i = 0; i < messages.length; ++i) {
                var message = messages[i];
                if (message.guid) {
                    responseQueue.push(message);
                } else {
                    eventQueue.push(message);
                }
            }
            processEvents();
            processResponses();
        }
        
        function processEvents() {
            if (!eventQueue) return;

            var events = eventQueue.concat();
            eventQueue = [];
            for (var i = 0; i < events.length; ++i) {
                var event = events[i];
                var command = event.command;
                var handler = eventHandlers[command];
                if (!handler) continue;

                var data = event.data;
                if (data !== undefined) {
                    handler(data);
                } else {
                    handler();
                }
            }
        }

        function processRequests() {
            if (!requestQueue) return;

            var messages = requestQueue.concat();
            requestQueue = [];
            var data = {
                messages: messages
            };
            data[channelId] = channelClients;
            if (domain) {
                data.domain = domain;
            }
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

        function processResponses() {
            if (!responseQueue) return;

            var responses = responseQueue.concat();
            responseQueue = [];
            for (var i = 0; i < responses.length; ++i) {
                var response = responses[i];
                var guid = response.guid;
                var callbacks = requestCallbacks[guid];
                if (!callbacks) continue;

                var data = response.data;
                switch (response.type) {
                    case 'progress':
                        if (callbacks.onprogress) {
                            callbacks.onprogress(data);
                        }
                        break;

                    case 'error':
                        delete requestCallbacks[guid];
                        if (callbacks.onresponse) {
                            callbacks.onresponse(data);
                        }
                        break;

                    case 'response':
                        delete requestCallbacks[guid];
                        data.unshift(null); // no error
                        if (callbacks.onresponse) {
                            callbacks.onresponse.apply(this, data);
                        }
                        break;
                }
            }
        }
        
        // xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        function createGuid() {
            var uuid = '';
            for (var i = 0; i < 36; ++i) {
                switch (i) {
                    case 8: case 13: case 18: case 23:
                        uuid += '-';
                        break;
                    case 14:
                        uuid += '4';
                        break;
                    case 19:
                        uuid += (Math.random() * 4 | 8).toString(16);
                        break;
                    default:
                        uuid += (Math.random() * 16 | 0).toString(16);
                    }
            }
            return uuid;
        }

        return {

            /**
             * Client identifier
             */
            tag: function() {
                return tag;
            },

            /**
             * Working domain
             */
            domain: function() {
                return domain;
            },

            /**
             * Progress callback of request
             * 
             * @callback BridgeCallbackProgress
             * @param {*=} data progress statement
             */

            /**
             * Response callback of request
             * 
             * @callback BridgeCallbackResponse
             * @param {*=} error error statement
             * @param {*...} args successful response arguments
             */

            /**
             * Bridge callback handlers
             * 
             * @typedef {object} BridgeCallbacks
             * @property {BridgeCallbackProgress=} onprogress progress update handler
             * @property {BridgeCallbackResponse=} onresponse response handler
             */

            /**
             * Send request to host
             * 
             * @param {string} command request type
             * @param {*...} args request arguments
             * @return {BridgeCallbacks}
             */
            request: function(command) {
                var guid = createGuid();
                var callbacks = {};
                requestCallbacks[guid] = callbacks;

                var request = {
                    ts: Date.now(),
                    guid: guid,
                    command: command + ''
                };
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length > 0) {
                    request.data = args;
                }
                if (tag) request.tag = tag;
                requestQueue.push(request);
                processRequests();
                return callbacks;
            },

            /**
             * Host event callback
             * 
             * @callback BridgeCallbackEvent
             * @param {*=} data event data
             */
                
            /**
             * Sign to host events
             * 
             * @param {string} command event type
             * @param {BridgeCallbackEvent} handler event handler
             */
            onevent: function(command, handler) {
                if (handler) {
                    eventHandlers[command] = handler;
                } else {
                    delete eventHandlers[command];
                }
            },

            /**
             * Shutdown and wipe out bridge
             * 
             * Must be called in case of client widget stops its job
             */
            destroy: function() {
                if (window.removeEventListener) {
                    window.removeEventListener('message', onMessage);
                } else {
                    window.detachEvent('onmessage', onMessage); // IE 8
                }
        
                eventHandlers = null;
                eventQueue = null;
                requestQueue = null;
                requestCallbacks = null;
                responseQueue = null;
            }
        }
    }

    if (typeof window.BridgeClient === 'undefined') window.BridgeClient = BridgeClient;

})();
