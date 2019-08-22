/**
 * Local cross-origin bridge, host side
 * 
 * @author meps
 */

(function() {
    'use strict';

    var channelHost = 'CORSBridgeHost';
    var channelClients = 'CORSBridgeClient';
    var channelId = 'cors_bridge_channel';

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
        var domain;
        var gatherInterval = 4;
        var gatherDirty = false;
        var requestHandlers = {};
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
            if (data[channelId] !== channelClients) return;
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
                var handler = requestHandlers[message.command];
                if (!handler) continue;

                var holder = BridgeHostRequest(message.guid, message.tag, appendReponse);
                var data = message.data;
                if (data) {
                    handler.apply(this, [holder].concat(data));
                } else {
                    handler(holder);
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
            data[channelId] = channelHost;
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

        function appendReponse(message) {
            outgoingQueue.push(message);
            processOutgoing();
        }

        return {

            /**
             * Working domain
             * 
             * @param {string|undefined} newDomain set up new domain or read current
             * @return {*} current domain
             */
            domain: function(newDomain) {
                if (newDomain !== undefined) domain = newDomain;
                return domain;
            },

            /**
             * 
             * @param {number|undefined} newGather set up new blockgathering time 
             */
            gather: function(newGather) {
                if (newGather !== undefined) gatherInterval = newGather > 4 ? newGather : 4;
                return gatherInterval;
            },

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

                outgoingQueue.push(event);
                processOutgoing();
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
