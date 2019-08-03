# Javascript RPC CORS bridge #

Simple javascript library that implements RPC with star topology for
cross-origin interaction between single host and some independent client
widgets. It allows straight usage of widgets loaded to iframes from the
different domains avoiding CORS limitations.

Host can broadcast simple events of different types to all clients and
handle specified client's requests.

Clients can receive specified events from host and make requests of
different types. Host can reply to client's request with continuous
progress, successful response or error statement.

## Running host ##

To run a host load module bridgehost.js and subscribe handlers to the
desired request types:

```js
// subscribe to the 'auth' requests from any client
BridgeHost.sign('auth', function(request, login, password) {
  // try to authorize
  if (login !== 'user' || password !== 'P@$$') {
      // reply with error statement
      request.error({ code: 1, message:'No such login or password' })
      return
  }
  
  // send some optional authorization progress 
  request.progress(0.25) // a quarter is done
  request.progress(0.50) // a half is done

  // reply with successful response
  request.response('Nickname', { canSpeak: true, canKick: true })
})

// broadcast update event 'messages' between all clients, so every
// subscriber can ignore it or request changes made since last update
BridgeHost.dispatch('messages', { room: 'chat', ts: 1564861965202 })
```

## Running clients

To run a client load module bridgeclient.js, create instance of client
bridge endpoint and subscribe handlers to the desired event types:

```js
// create client bridge
var bridge = BridgeClient()

// subscribe to the 'messages' event
bridge.sign('messages', function(context) {
  // check for context and time of update at event payload
  if (context.room !== currentRoom || context.ts <= lastUpdateTime) return
  
  // request new data if it has been changed
  var handler = bridge.request('list', currentRoom)
  handler.response(function(messages) {
    // update messages within current room
    currentMessages = messages
    lastUpdateTime = Date.now()
  })
  handler.error(function(error) {
    // handle error statement of request
    console.error(error)
  })
})

```
