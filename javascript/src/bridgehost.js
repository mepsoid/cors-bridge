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
    var frameName = 'cb617878-1956-4d6a-b087-dc73b223960d';

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

        var frame = document.createElement('iframe');
        frame.setAttribute('name', frameName);
        frame.style.display = 'none';
        document.head.appendChild(frame);
        var frameWindow = frame.contentWindow;
        if (frameWindow.addEventListener) {
            frameWindow.addEventListener('message', onMessage);
        } else {
            frameWindow.attachEvent('onmessage', onMessage); // IE 8
        }

        function onMessage(event) {
            var data = event.data;
            if (typeof(data) !== 'object') return;
            if (data[channelId] !== channelClients) return;
            if (!domain && data.domain !== domain) return;

            var messages = data.messages;
            if (messages) incomingQueue = incomingQueue.concat(messages);
            processIncoming();
        }

        function processIncoming() {
            if (incomingQueue.length === 0) return;

            var messages = incomingQueue.concat();
            incomingQueue = [];
            for (var i = 0; i < messages.length; ++i) {
                var message = messages[i];
                if (!message) continue;

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
            if (outgoingQueue.length === 0 || gatherDirty) return;

            gatherDirty = true;
            setTimeout(commitOutgoing, gatherInterval);
        }

        function commitOutgoing() {
            gatherDirty = false;
            if (outgoingQueue.length === 0) return;

            var messages = outgoingQueue.concat();
            outgoingQueue = [];
            var data = {
                messages: messages
            };
            data[channelId] = channelHost;
            if (domain) data.domain = domain;

            var targets = [root];
            while (targets.length > 0) {
                var target = targets.shift();
                targets = targets.concat(Array.prototype.slice.call(target.frames));
                if (target.name === frameName)
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

    if (typeof(window.BridgeHost) === 'undefined') window.BridgeHost = BridgeHost();
})();
