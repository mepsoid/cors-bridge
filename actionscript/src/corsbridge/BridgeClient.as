package corsbridge {
	
	import flash.external.ExternalInterface;
	import flash.system.Security;
	import flash.utils.setTimeout;
	
	/**
	 * Client bridge
	 * 
	 * @author meps
	 */
	public class BridgeClient {
		
		public function BridgeClient(options:Object = null) {
			Security.allowDomain('*');
			if (!ExternalInterface.available)
				throw new Error('ExternalInterface unavailable');
			
			if (options) {
				_tag = options['tag'];
				_domain = options['domain'];
				_gatherInterval = parseInt(options['gather']);
				if (_gatherInterval < 4) _gatherInterval = 4;
			}
			
			// TODO catch and process exception if name already has been taken
			ExternalInterface.addCallback(METHOD_RECEIVER, onMessage);
			ExternalInterface.call(METHOD_SUBSCRIBE, METHOD_RECEIVER);
		}
		
		/** Client identifier for debugging */
		public function get tag():* {
			return _tag;
		}
		
		/** Working domain */
		public function get domain():String {
			return _domain;
		}
		
		/**
		 * Send request to host
		 * 
		 * @param command request type
		 * @param rest request arguments
		 * @return request handler object
		 */
		public function request(command:String, ...rest):BridgeRequest {
			var guid:String = BridgeUtils.createGuid();
			var handler:BridgeRequest = new BridgeRequest();
			_requestCallbacks[guid] = handler;
			
			var request:Object = {
				ts: new Date().time,
				guid: guid,
				command: command
			};
			if (tag != null) request.tag = tag;
			if (rest.length > 0) request.data = rest;
			
			_outgoingQueue.push(request);
			processOutgoing();
			return handler;
		}
		
		/**
		 * Sign to specific host events
		 * 
		 * @param command event type
		 * @param handler specific events handler
		 */
		public function onevent(command:String, handler:Function):void {
			if (handler != null) {
				_eventHandlers[command] = handler;
			} else {
				delete _eventHandlers[command];
			}
		}
		
		/**
		 * Sign to all host events
		 * 
		 * @param handler handler for all events
		 */
		public function onevents(handler:Function):void {
			_eventEvery = handler;
		}
		
		/**
		 * Shutdown and wipe out bridge
		 * 
		 * Must be called in case of client widget stops its job
		 */
		public function destroy():void {
			ExternalInterface.call(METHOD_UNSUBSCRIBE, METHOD_RECEIVER);
			_eventEvery = null;
			_eventHandlers = null;
			_requestCallbacks = null;
			_incomingQueue = null;
			_outgoingQueue = null;
		}
		
		////////////////////////////////////////////////////////////////////////
		
		private function onMessage(content:*):void {
			var data:Object = content as Object;
			if (!data) return;
			if (data[CHANNEL_ID] != CHANNEL_HOST) return;
			if (domain != null && data.domain != domain) return;
			
			var messages:Array = data['messages'] as Array;
			_incomingQueue = _incomingQueue.concat(messages);
			processIncoming();
		}
		
		private function processIncoming():void {
			if (_incomingQueue.length == 0) return;
			
			var messages:Array = _incomingQueue.concat();
			_incomingQueue.length = 0;
			for (var i:int = 0; i < messages.length; ++i) {
				var message:Object = messages[i];
				var guid:String = message.guid;
				var data:Object = message.data;
				if (guid != null) {
					// response
					var callbacks:BridgeRequest = _requestCallbacks[guid];
					if (!callbacks) continue;
					
					switch (message.type) {
						case 'progress':
							if (callbacks.onprogress != null) {
								callbacks.onprogress(data);
							}
							break;
						
						case 'error':
							delete _requestCallbacks[guid];
							if (callbacks.onresponse != null) {
								callbacks.onresponse(data);
							}
							break;
						
						case 'response':
							delete _requestCallbacks[guid];
							var rest:Array = [null].concat(data as Array);
							if (callbacks.onresponse != null) {
								callbacks.onresponse.apply(null, rest);
							}
							break;
					}
				} else {
					// event
					var command:String = message.command;
					if (_eventEvery != null) {
						_eventEvery(command, data);
					}
					
					var handler:Function = _eventHandlers[command];
					if (handler != null) {
						handler(data);
					}
				}
			}
		}
		
		private function processOutgoing():void {
			if (_outgoingQueue.length == 0 || _gatherDirty) return;
			
			_gatherDirty = true;
			setTimeout(commitOutgoing, _gatherInterval);
		}
		
		private function commitOutgoing():void {
			_gatherDirty = false;
			if (_outgoingQueue.length == 0) return;
			
			var messages:Array = _outgoingQueue.concat();
			_outgoingQueue.length = 0;
			var data:Object = {
				messages: messages
			};
			data[CHANNEL_ID] = CHANNEL_CLIENTS;
			if (domain != null) data.domain = domain;
			
			ExternalInterface.call(METHOD_SENDER, data);
		}
		
		private var _tag:*;
		private var _domain:String;
		private var _gatherInterval:int;
		private var _gatherDirty:Boolean = true;
		private var _eventEvery:Function;
		private var _eventHandlers:Object = {};
		private var _requestCallbacks:Object = {};
		private var _incomingQueue:Array = [];
		private var _outgoingQueue:Array = [];
		
		private static const CHANNEL_HOST:String = 'CORSBridgeHost';
		private static const CHANNEL_CLIENTS:String = 'CORSBridgeClient';
		private static const CHANNEL_ID:String = 'cors_bridge_channel';
		private static const METHOD_SUBSCRIBE:String = 'flashBridgeSubscribe';
		private static const METHOD_UNSUBSCRIBE:String = 'flashBridgeUnsubscribe';
		private static const METHOD_SENDER:String = 'flashBridgeBroadcast';
		private static const METHOD_RECEIVER:String = 'flashBridgeMessage';
		
	}
	
}