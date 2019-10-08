/**
 * Local cross-origin bridge, host side
 * 
 * @author meps
 */

(function() {
    'use strict';

    var CHANNEL_KEY = 'cors_bridge_channel';
    var CHANNEL_HOST = 'ca5cd683-f69b-4852-b60d-a9c45bf83756';
    var CHANNEL_CLIENTS = '5161b727-51e9-4e65-8b2f-511e39eb5f29';
    var FRAME_NAME = 'cb617878-1956-4d6a-b087-dc73b223960d';

    /**
     * Client request holder
     */
    function BridgeHostRequest(guid, tag, queueAppender) {
        var completed = false;
        
        /**
         * Client identifier
         */
        this.tag = function() {
            return tag;
        }

        /**
         * Send update with request processing state
         * 
         * @param {*=} state current progress statement
         */
        this.progress = function(state) {
            if (completed) {
                throw new Error('Cannot apply to completed request');
            }
            
            queueAppender({
                guid: guid,
                ts: Date.now(),
                type: 'progress',
                data: state
            });
        }

        /**
         * Complete request 
         * 
         * @param {object=} error error statement
         * @param {*...} args arguments of successful response
         */
        this.response = function(error) {
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

        var frame = document.getElementsByName(FRAME_NAME)[0];
        if (!frame) {
            frame = document.createElement('iframe');
            frame.setAttribute('name', FRAME_NAME);
            frame.style.display = 'none';
            document.head.appendChild(frame);
        }
        var frameWindow = frame.contentWindow;
        if (frameWindow.addEventListener) {
            frameWindow.addEventListener('message', onMessage);
        } else {
            frameWindow.attachEvent('onmessage', onMessage); // IE 8
        }

        function onMessage(event) {
            var data = event.data;
            if (typeof(data) !== 'object') return;
            if (data[CHANNEL_KEY] !== CHANNEL_CLIENTS) return;
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

                var holder = new BridgeHostRequest(message.guid, message.tag, appendReponse);
                var data = message.data;
                if (data) {
                    handler.apply(null, [holder].concat(data));
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
            data[CHANNEL_KEY] = CHANNEL_HOST;
            if (domain) data.domain = domain;

            var targets = [root];
            while (targets.length > 0) {
                var target = targets.shift();
                if (target.length > 0) {
                    var frame = getFrame(target);
                    for (var i = 0; i < target.length; ++i) {
                        var item = target[i];
                        if (item !== frame) targets.push(item);
                    }
                    if (frame) frame.postMessage(data, '*');
                }
            }
        }

        // Workaround for missing attribute error in local filesystem
        function getFrame(target) {
            var frame;
            try {
                frame = target[FRAME_NAME];
            } catch(err) { }
            return frame;
        }

        function appendReponse(message) {
            outgoingQueue.push(message);
            processOutgoing();
        }

        /**
         * Working domain
         * 
         * @param {string|undefined} newDomain set up new domain or read current
         * @return {*} current domain
         */
        this.domain = function(newDomain) {
            if (newDomain !== undefined) domain = newDomain;
            return domain;
        }

        /**
         * 
         * @param {number|undefined} newGather set up new blockgathering time 
         */
        this.gather = function(newGather) {
            if (newGather !== undefined) gatherInterval = newGather > 4 ? newGather : 4;
            return gatherInterval;
        }

        /**
         * Send event to all active clients
         * 
         * @param {string} command event type
         * @param {*=} data event payload
         */
        this.dispatch = function(command, data) {
            var event = {
                ts: Date.now(),
                command: command + ''
            };
            if (data !== undefined) event.data = data;

            outgoingQueue.push(event);
            processOutgoing();
        }

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
        this.onrequest = function(command, handler) {
            if (handler) {
                requestHandlers[command] = handler;
            } else {
                delete requestHandlers[command];
            }
        }

    }

    window.BridgeHost = window.BridgeHost || new BridgeHost();

})();
