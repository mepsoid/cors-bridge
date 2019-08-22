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
     * @property {string} domain working domain identifier
     * @property {number} gather time interval (ms) for gathering outgoing data
     */

    /**
     * Client bridge
     * 
     * @param {BridgeOptions=} options initial setup options
     */
    function BridgeClient(options) {
        var tag = options ? options.tag : undefined;
        var domain = options ? options.domain : '';
        var gatherInterval = options && options.gather > 4 ? options.gather : 4;
        var gatherDirty = false;
        var eventEvery;
        var eventHandlers = {};
        var requestCallbacks = {};
        var incomingQueue = [];
        var outgoingQueue = [];

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
            incomingQueue = incomingQueue.concat(messages);
            processIncoming();
        }
        
        function processIncoming() {
            if (!incomingQueue) return;

            var messages = incomingQueue.concat();
            incomingQueue = [];
            for (var i = 0; i < messages.length; ++i) {
                var message = messages[i];
                var guid = message.guid;
                var data = message.data;
                if (guid) {
                    // response
                    var callbacks = requestCallbacks[guid];
                    if (!callbacks) continue;

                    switch (message.type) {
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
                } else {
                    // event
                    var command = message.command;
                    if (eventEvery) {
                        eventEvery(command, data);
                    }

                    var handler = eventHandlers[command];
                    if (handler) {
                        handler(data);
                    }
                }
            }
        }

        function processOutgoing() {
            if (!outgoingQueue || gatherDirty) return;

            gatherDirty = true;
            setTimeout(commitOutgoing, gatherInterval);
        }

        function commitOutgoing() {
            gatherDirty = false;
            if (!outgoingQueue) return;

            var messages = outgoingQueue.concat();
            outgoingQueue = [];
            var data = {
                messages: messages
            };
            data[channelId] = channelClients;
            if (domain) data.domain = domain;

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
                if (tag) request.tag = tag;
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length > 0) request.data = args;

                outgoingQueue.push(request);
                processOutgoing();
                return callbacks;
            },

            /**
             * Host specific event callback
             * 
             * @callback BridgeSpecificEvent
             * @param {*=} data event data
             */
                
            /**
             * Sign to host events
             * 
             * @param {string} command event type
             * @param {BridgeSpecificEvent} handler specific events handler
             */
            onevent: function(command, handler) {
                if (handler) {
                    eventHandlers[command] = handler;
                } else {
                    delete eventHandlers[command];
                }
            },

            /**
             * Host every event handler
             * 
             * @callback BridgeSpecificEvent
             * @param {string} command event type
             * @param {*=} data event data
             */

            /**
             * Sign on all possible events
             * 
             * @param {BridgeEveryEvent} handler handler for all events
             */
            onevents: function(handler) {
                eventEvery = handler;
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

                eventEvery = null;
                eventHandlers = null;
                requestCallbacks = null;
                incomingQueue = null;
                outgoingQueue = null;
            }
        }
    }

    if (typeof window.BridgeClient === 'undefined') window.BridgeClient = BridgeClient;

})();
