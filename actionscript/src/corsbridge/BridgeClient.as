package corsbridge {
	
	import flash.external.ExternalInterface;
	import flash.system.Security;
	
	/**
	 * ...
	 * @author meps
	 */
	public class BridgeClient {
		
		public function BridgeClient(options:Object = null) {
			Security.allowDomain('*');
			if (!ExternalInterface.available)
				throw new Error('ExternalInterface unavailable');
			
			if (options) {
				_tag = options['tag'];
			}
			
			// TODO catch and process exception if name already has been taken
			ExternalInterface.addCallback(METHOD_RECEIVER, onMessage);
			ExternalInterface.call(METHOD_SUBSCRIBE, METHOD_RECEIVER);
		}
		
		/** Client identifier for debugging */
		public function get tag():* {
			return _tag;
		}
		
		/**
		 * Send request to host
		 * 
		 * @param command request type
		 * @param rest request arguments
		 * @return request handler object
		 */
		public function request(command:String, ...rest):BridgeRequest {
			var guid:String = BridgeUtils.uuid();
			var handler:BridgeRequest = new BridgeRequest();
			_requestHandlers[guid] = handler;
			
			var request:Object = {
				ts: new Date().time,
				guid: guid,
				command: command
			};
			if (rest.length > 0) request.data = rest;
			if (tag) request.tag = tag;
			
			_requestQueue.push(request);
			processRequests();
			return handler;
		}
		
		/**
		 * Sign to host events
		 * 
		 * @param command event type
		 * @param handler event handler
		 */
		public function  onevent(command:String, handler:Function):void {
			if (handler != null) {
				_eventHandlers[command] = handler;
			} else {
				delete _eventHandlers[command];
			}
		}
		
		/**
		 * Shutdown and wipe out bridge
		 * 
		 * Must be called in case of client widget stops its job
		 */
		public function destroy():void {
			ExternalInterface.call(METHOD_UNSUBSCRIBE, METHOD_RECEIVER);
			_eventQueue = null;
			_eventHandlers = null;
			_requestQueue = null;
			_requestHandlers = null;
			_responseQueue = null;
		}
		
		////////////////////////////////////////////////////////////////////////
		
		private function onMessage(content:*):void {
			var data:Object = content as Object;
			if (!data) return;
			if (!data.hasOwnProperty(CHANNEL_ID) || data[CHANNEL_ID] != CHANNEL_HOST) return;
			
			var messages:Array = data['messages'] as Array;
			for (var i:int = 0; i < messages.length; ++i) {
				var message:Object = messages[i];
				if (message.guid) {
					_responseQueue.push(message);
				} else {
					_eventQueue.push(message);
				}
			}
			processEvents();
			processResponses();
		}
		
		private function processEvents():void {
			if (_eventQueue.length == 0) return;
			
			var events:Array = _eventQueue.concat();
			_eventQueue.length = 0;
			for (var i:int = 0; i < events.length; ++i) {
				var event:Object = events[i];
				var command:String = event.command;
				var handler:Function = _eventHandlers[command];
				if (handler == null) continue;
				
				var data:Object = event.data;
				handler(data);
			}
		}
		
		private function processRequests():void {
			if (_requestQueue.length == 0) return;
			
			var messages:Array = _requestQueue.concat();
			_requestQueue.length = 0;
			var data:Object = {
				messages: messages
			};
			data[CHANNEL_ID] = CHANNEL_CLIENTS;
			ExternalInterface.call(METHOD_SENDER, data);
		}
		
		private function processResponses():void {
			if (_responseQueue.length == 0) return;
			
			var responses:Array = _responseQueue.concat();
			_responseQueue.length = 0;
			for (var i:int = 0; i < responses.length; ++i) {
				var response:Object = responses[i];
				var guid:String = response.guid;
				var handler:BridgeRequest = _requestHandlers[guid];
				if (!handler) continue;
				
				var data:Object = response.data;
				switch (response.type) {
					case 'progress':
						if (handler.onprogress != null) {
							handler.onprogress(data);
						}
						break;
					
					case 'error':
						delete _requestHandlers[guid];
						if (handler.onresponse != null) {
							handler.onresponse(data);
						}
						break;
					
					case 'response':
						delete _requestHandlers[guid];
						var rest:Array = [null].concat(data as Array);
						if (handler.onresponse != null) {
							handler.onresponse.apply(null, rest);
						}
						break;
				}
			}
		}
		
		private var _tag:*;
		private var _eventQueue:Array = [];
		private var _eventHandlers:Object = {};
		private var _requestQueue:Array = [];
		private var _requestHandlers:Object = {};
		private var _responseQueue:Array = [];
		
		private static const CHANNEL_HOST:String = 'CORSBridgeHost';
		private static const CHANNEL_CLIENTS:String = 'CORSBridgeClient';
		private static const CHANNEL_ID:String = 'cors_bridge_channel';
		private static const METHOD_SUBSCRIBE:String = 'flashBridgeSubscribe';
		private static const METHOD_UNSUBSCRIBE:String = 'flashBridgeUnsubscribe';
		private static const METHOD_SENDER:String = 'flashBridgeBroadcast';
		private static const METHOD_RECEIVER:String = 'flashBridgeMessage';
		
	}
	
}