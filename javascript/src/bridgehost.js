/**
 * Local cross-frame bridge, host side
 * @author meps
 */

'use strict';

(function() {

    function BridgeHostRequest(requestId, requestData, queueAppender) {
        var
            completed = false,
            guid = requestId
        
        return {

            /**
             * Requested data
             */
            data: requestData,

            /**
             * Send update with request processing state
             * 
             * @param {*} state
             */
            progress: function(state) {
                if (completed) throw new Error('Cannot apply to completed request')
                
                queueAppender({
                    guid: guid,
                    ts: Date.now(),
                    type: 'progress',
                    data: state
                })
            },

            /**
             * Complete request with successful response
             * 
             * @param {*} rest
             */
            response: function(rest) {
                if (completed) throw new Error('Cannot apply to completed request')

                completed = true
                queueAppender({
                    guid: guid,
                    ts: Date.now(),
                    type: 'response',
                    data: Array.prototype.slice.call(arguments)
                })
            },

            /**
             * Complete request with error statement
             * 
             * @param {*} error 
             */
            error: function(error) {
                if (completed) throw new Error('Cannot apply to completed request')

                completed = true
                queueAppender({
                    guid: guid,
                    ts: Date.now(),
                    type: 'error',
                    data: error
                })
            }
        }
    }

    function BridgeHost() {
        var
            channelHost = 'BRHOST#',
            channelClients = 'BRCLIENT#',
            eventQueue = [],
            requestHandlers = {},
            requestQueue = [],
            responseQueue = []

        var root = window
        while (root !== root.parent) root = root.parent

        if (window.addEventListener) {
            window.addEventListener('message', onMessage)
        } else {
            window.attachEvent('onmessage', onMessage) // IE 8
        }

        function onMessage(event) {
            var data = event.data
            if (data.indexOf(channelClients) !== 0) return

            data = data.substr(channelClients.length)
            var messages = JSON.parse(data)
            requestQueue = requestQueue.concat(messages)
            processRequests()
        }

        function processRequests() {
            if (!requestQueue) return

            var requests = requestQueue.concat()
            requestQueue = []
            for (var i = 0; i < requests.length; ++i) {
                var request = requests[i]
                var id = request.guid
                var command = request.command
                var data = request.data
                var handlers = requestHandlers[command]
                if (handlers) {
                    var holder = BridgeHostRequest(id, data, appendReponse)
                    for (var i = 0; i < handlers.length; ++i) {
                        var  handler = handlers[i]
                        handler(holder)
                    }
                }
            }
        }

        function processEvents() {
            if (!eventQueue) return

            var events = eventQueue.concat()
            eventQueue = []
            sendMessages(events)
        }

        function sendMessages(messages) {
            var data = channelHost + JSON.stringify(messages)
            var targets = Array.prototype.slice.call(root.frames)
            targets.push(root)
            for (var i = 0; i < targets.length; ++i) {
                var target = targets[i]
                target.postMessage(data, '*')
            }
        }

        function appendReponse(message) {
            responseQueue.push(message)
            processResponses()
        }

        function processResponses() {
            if (!responseQueue) return

            var responses = responseQueue.concat()
            responseQueue = []
            sendMessages(responses)
        }

        return {

            /**
             * Send event to clients
             * 
             * @param {string} command event type
             * @param {*} data event payload
             */
            dispatch: function(command, data) {
                var event = {
                    ts: Date.now(),
                    command: command + ''
                }
                if (data !== undefined) event.data = data
                eventQueue.push(event)
                processEvents()
            },

            /**
             * Sign to clients requests
             * 
             * @param {string} command request type
             * @param {*} handler request handler
             */
            sign: function(command, handler) {
                var handlers = requestHandlers[command]
                if (!handlers) {
                    requestHandlers[command] = [handler]
                } else if (handlers.indexOf(handler) < 0) {
                    handlers.push(handler)
                }
            },

            /**
             * Unsign from clients requests
             * 
             * @param {string} command request type
             * @param {*} handler request handler
             */
            unsign: function(command, handler) {
                var handlers = requestHandlers[command]
                if (handlers) {
                    var index = handlers.indexOf(handler)
                    if (index >= 0) {
                        handlers.splice(index)
                    }
                }
            }

        }
    }

    if (typeof window.BridgeHost === 'undefined') window.BridgeHost = BridgeHost()
})()
