package corsbridge {
	
	public class BridgeUtils {
		
		/**
		 * Universally unique id generator
		 * 
		 * @return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
		 */
		public static function createGuid():String {
			var uuid:String = '';
			for (var i:int = 0; i < 36; ++i) {
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
		
	}
	
}