package {
	
	import corsbridge.BridgeClient;
	import corsbridge.BridgeRequest;
	import fl.controls.Button;
	import fl.controls.Label;
	import flash.display.Sprite;
	import flash.display.StageAlign;
	import flash.display.StageScaleMode;
	import flash.events.Event;
	import flash.events.MouseEvent;
	import flash.external.ExternalInterface;
	import flash.text.TextFieldAutoSize;
	import flash.text.TextFormat;
	import flash.utils.getQualifiedClassName;
	
	/**
	 * ...
	 * @author meps
	 */
	public class Main extends Sprite {
		
		public function Main() {
			if (stage)
				init();
			else
				addEventListener(Event.ADDED_TO_STAGE, init);
		}
		
		private function init(event:Event = null):void {
			if (event)
				removeEventListener(Event.ADDED_TO_STAGE, init);
			
			stage.align = StageAlign.TOP_LEFT;
			stage.scaleMode = StageScaleMode.NO_SCALE;
			
			bridge = new BridgeClient({
				tag: int(Math.random() * 1000)
			});
			
			bridge.onevent('hello', function(event:Object):void {
				log('@' + bridge.tag, 'hello:', event);
			});
			
			var headerFormat:TextFormat = new TextFormat();
			headerFormat.size = 23;
			headerFormat.bold = true;
			var header:Label = new Label();
			header.autoSize = TextFieldAutoSize.LEFT;
			header.setStyle('textFormat', headerFormat);
			header.text = 'Widget @' + bridge.tag;
			header.move(10, 10);
			header.opaqueBackground = 0x9ACD32;
			addChild(header);
			
			var labelFormat:TextFormat = new TextFormat();
			labelFormat.size = 16;
			var label1:Label = new Label();
			label1.autoSize = TextFieldAutoSize.LEFT;
			label1.setStyle('textFormat', labelFormat);
			label1.text = 'Send request to host:';
			label1.move(10, header.y + header.height + 20);
			addChild(label1);
			
			var button1:Button = new Button();
			button1.label = 'REQUEST';
			button1.move(10, label1.y + label1.height + 15);
			button1.height = 26;
			button1.addEventListener(MouseEvent.CLICK, function(event:Event):void {
				procRequest(bridge.request('greet'));
			});
			addChild(button1);
			
			var button2:Button = new Button();
			button2.label = 'REQUEST primitive';
			button2.move(button1.x + button1.width + 5, button1.y);
			button2.height = button1.height;
			button2.addEventListener(MouseEvent.CLICK, function(event:Event):void {
				procRequest(bridge.request('greet', 'howdy'));
			});
			addChild(button2);
			
			var button3:Button = new Button();
			button3.label = 'REQUEST ...rest';
			button3.move(button2.x + button2.width + 5, button1.y);
			button3.height = button1.height;
			button3.addEventListener(MouseEvent.CLICK, function(event:Event):void {
				procRequest(bridge.request('greet', [0, 1, true], undefined, false, -4378.323, {a:{aa:'a', ab:23, ac:null}, b:[]}, NaN));
			});
			addChild(button3);
			
			var label2:Label = new Label();
			label2.autoSize = TextFieldAutoSize.LEFT;
			label2.setStyle('textFormat', labelFormat);
			label2.text = 'Destroy self bridge:';
			label2.move(10, button1.y + button1.height + 15);
			addChild(label2);
			
			var button4:Button = new Button();
			button4.label = 'DESTROY';
			button4.move(10, label2.y + label2.height + 15);
			button4.height = button1.height;
			button4.addEventListener(MouseEvent.CLICK, function(event:Event):void {
				bridge.destroy();
			});
			addChild(button4);
		}
		
		private function procRequest(request:BridgeRequest):void {
			request.onresponse = function(error:Object, ...rest):void {
				if (error) {
					log('@' + bridge.tag, 'error:', error);
				} else {
					log('@' + bridge.tag, 'response:', rest);
				}
			}
			request.onprogress = function(state:Object):void {
				log('@' + bridge.tag, 'progress:', state);
			}
		}
		
		private function log(...rest):void {
			var args:Array = rest.map(function(item:*, index:int, arr:Array):String {
				var className:String = getQualifiedClassName(item);
				return className == 'Object' || className == 'Array' ? JSON.stringify(item) : item;
			});
			var str:String = args.join(' ');
			trace(str);
			ExternalInterface.call('console.log', str);
		}
		
		private var bridge:BridgeClient;
		
	}
	
}