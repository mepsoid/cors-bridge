/**
 * Local cross-frame bridge, client side
 * @author meps
 */

'use strict';

(function() {

	function BridgeClientRequest(callbackHolder) {
		return {

			/**
			 * Register all response handlers
			 * 
			 * @param {*} response successful response handler
			 * @param {*} error error handler
			 * @param {*} progress progress response handler
			 */
			listen: function(response, error, progress) {
				callbackHolder.response = response
				if (error) callbackHolder.error = error
				if (progress) callbackHolder.progress = progress
				return this
			},

			/**
			 * Register successful response handler
			 * 
			 * @param {*} response successful response handler
			 */
			response: function(response) {
				callbackHolder.response = response
				return this
			},

			/**
			 * Register response progress handler
			 * 
			 * @param {*} progress progress response handler
			 */
			progress: function(progress) {
				callbackHolder.progress = progress
				return this
			},

			/**
			 * Register response error handler
			 * 
			 * @param {*} error error handler
			 */
			error: function(error) {
				callbackHolder.error = error
				return this
			}
		}
	}

	function BridgeClient(tag) {
		var
			channelHost = 'BRHOST#',
			channelClients = 'BRCLIENT#',
			eventHandlers = {},
			eventQueue = [],
			requestQueue = [],
			requestHolders = {},
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
            if (data.indexOf(channelHost) !== 0) return

			data = data.substr(channelHost.length)
			var messages = JSON.parse(data)
			for (var i = 0; i < messages.length; ++i) {
				var message = messages[i]
				if (message.guid) {
					responseQueue.push(message)
				} else {
					eventQueue.push(message)
				}
			}
			processEvents()
			processResponses()
		}
		
		function processEvents() {
			if (!eventQueue) return

			var events = eventQueue.concat()
			eventQueue = []
			for (var i = 0; i < events.length; ++i) {
				var event = events[i]
                var command = event.command
                var data = event.data
				var handlers = eventHandlers[command]
				if (handlers) {
					for (var j = 0; j < handlers.length; ++j) {
						var handler = handlers[j]
						handler(data)
					}
				}
			}
		}

		function processRequests() {
			if (!requestQueue) return

			var requests = requestQueue.concat()
			requestQueue = []
			var data = channelClients + JSON.stringify(requests)
            var targets = Array.prototype.slice.call(root.frames)
            targets.push(root)
            for (var i = 0; i < targets.length; ++i) {
                var target = targets[i]
                target.postMessage(data, '*')
            }
		}

		function processResponses() {
			if (!responseQueue) return

			var responses = responseQueue.concat()
			responseQueue = []
			for (var i = 0; i < responses.length; ++i) {
				var response = responses[i]
				var guid = response.guid
				var holder = requestHolders[guid]
				if (!holder) continue

				switch (response.type) {
					case 'progress':
						holder.progress(response.data)
						break

					case 'error':
						delete requestHolders[guid]
						holder.error(response.data)
						break

					case 'response':
						delete requestHolders[guid]
						holder.response.apply(null, response.data)
						break
				}
			}
		}
		
		/** @link https://gist.github.com/kaizhu256/4482069 */
		function uuid() {
			// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			var uuid = '', ii
			for (ii = 0; ii < 32; ++ii) {
				switch (ii) {
					case 8:
					case 20:
						uuid += '-'
						uuid += (Math.random() * 16 | 0).toString(16)
						break;
					case 12:
						uuid += '-'
						uuid += '4'
						break;
					case 16:
						uuid += '-'
						uuid += (Math.random() * 4 | 8).toString(16)
						break;
					default:
						uuid += (Math.random() * 16 | 0).toString(16)
					}
			}
			return uuid
		}

		return {

			/**
			 * Optional client identifier
			 */
			tag: tag,

			/**
			 * Send request to host
			 * 
			 * @param {string} command request type
			 * @param {*} data request data
			 * @return {BridgeClientRequest}
			 */
			request: function(command, data) {
				var guid = uuid()
				var callbacks = {}
				var holder = BridgeClientRequest(callbacks)
				requestHolders[guid] = callbacks

				var request = {
					ts: Date.now(),
					guid: guid,
					command: command + ''
				}
                var args = Array.prototype.slice.call(arguments)
                if (args.length > 1) {
                    args.shift()
                    request.data = args
                }
				if (tag) request.tag = tag
				requestQueue.push(request)
				processRequests()
				return holder
			},
				
            /**
             * Sign to host events
             * 
             * @param {string} command event type
             * @param {*} handler event handler
             */
			sign: function(command, handler) {
				var handlers = eventHandlers[command]
				if (!handlers) {
					eventHandlers[command] = [handler]
				} else if (handlers.indexOf(handler) < 0) {
					handlers.push(handler)
				}
			},

            /**
             * Unsign from host events
             * 
             * @param {string} command event type
             * @param {*} handler event handler
             */
			unsign: function(command, handler) {
				var handlers = eventHandlers[command]
				if (handlers) {
                    var index = handlers.indexOf(handler)
                    if (index >= 0) {
                        handlers.splice(index)
                    }
				}
			},

			/**
			 * Shutdown and wipe out bridge
			 * 
			 * Must be called in case of client widget stops its job
			 */
			destroy: function() {
				if (window.removeEventListener) {
					window.removeEventListener('message', onMessage)
				} else {
					window.detachEvent('onmessage', onMessage) // IE 8
				}
		
				eventHandlers = null
				eventQueue = null
				requestQueue = null
				requestHolders = null
				responseQueue = null
			}
		}
	}

	if (typeof window.BridgeClient === 'undefined') window.BridgeClient = BridgeClient

})()
