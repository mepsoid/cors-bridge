var bridge = new BridgeClient({
    tag: Math.random() * 1000 | 0,
    gather: 2000
});

window.onload = function selfIdent() {
    var header = document.getElementById('header');
    header.innerHTML += ' @' + bridge.tag();
}

function procRequest(request) {
    request.onresponse = function(error, rest) {
        if (error) {
            console.log(`@${bridge.tag()} error:`, error);
        } else {
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            console.log(`@${bridge.tag()} response:`, args);
        }
    }
    request.onprogress = function(state) {
        console.log(`@${bridge.tag()} progress:`, state);
    }
}

bridge.onevent('hello', function(event) {
    console.log(`@${bridge.tag()} hello:`, event);
});

bridge.onevents(function(command, data) {
    console.log(`@${bridge.tag()} every ${command}:`, data);
});
