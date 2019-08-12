
var handlerName = null;
var root = window;
while (root !== root.parent) {
    root = root.parent;
}

function onMessage(message) {
    if (!handlerName) return;

    var container = navigator.appName.indexOf("Microsoft") >= 0 ?
        window['client'] :
        document['client'];
    var handler = container[handlerName];
    if (handler) handler(message.data);
}

function flashBridgeSubscribe(name) {
    if (handlerName) return;

    handlerName = name;
    if (window.addEventListener) {
        window.addEventListener('message', onMessage);
    } else {
        window.attachEvent('onmessage', onMessage); // IE 8
    }
}

function flashBridgeUnsubscribe(name) {
    if (!handlerName) return;

    handlerName = null;
    if (window.removeEventListener) {
        window.removeEventListener('message', onMessage);
    } else {
        window.detachEvent('onmessage', onMessage); // IE 8
    }
}

function flashBridgeBroadcast(data) {
    var targets = [root];
    for (var i = 0; i < targets.length; ++i) {
        var target = targets[i];
        target.postMessage(data, '*');
        
        var frames = Array.prototype.slice.call(target.frames);
        targets = targets.concat(frames);
    }
}

