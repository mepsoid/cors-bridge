package corsbridge {
	
	/**
	 * Request handler object
	 * 
	 * @author meps
	 */
	public class BridgeRequest {
		
		public function BridgeRequest() {
		}
		
		 /**
		  * Progress update handler
		  */
		public var onprogress:Function;
		
		/**
		 * Response and error handler
		 */
		public var onresponse:Function;
		
	}
	
}