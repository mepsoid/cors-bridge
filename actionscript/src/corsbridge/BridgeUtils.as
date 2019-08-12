package corsbridge {
	
	/**
	 * 
	 * @author meps
	 */
	public class BridgeUtils {
		
		/**
		 * Universally unique id generator
		 * 
		 * @return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
		 * @link https://gist.github.com/kaizhu256/4482069
		 */
		public static function uuid():String {
			var uuid:String = '';
			for (var i:int = 0; i < 32; ++i) {
				switch (i) {
					case 8:
					case 20:
						uuid += '-';
						uuid += int(Math.random() * 16).toString(16);
						break;
					case 12:
						uuid += '-';
						uuid += '4';
						break;
					case 16:
						uuid += '-';
						uuid += (int(Math.random() * 4) | 8).toString(16);
						break;
					default:
						uuid += int(Math.random() * 16).toString(16);
					}
			}
			return uuid;
		}
		
	}
	
}