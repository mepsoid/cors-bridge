var FRAME_NAME = 'cb617878-1956-4d6a-b087-dc73b223960d';

var handlerName = null;
var root = window;
while (root !== root.parent) {
    root = root.parent;
}

var frame = document.getElementsByName(FRAME_NAME)[0];
if (!frame) {
    frame = document.createElement('iframe');
    frame.setAttribute('name', FRAME_NAME);
    frame.style.display = 'none';
    document.head.appendChild(frame);
}

function onMessage(message) {
    if (!handlerName) return;

    var container = navigator.appName.indexOf("Microsoft") >= 0 ?
        window['client'] :
        document['client'];
    var handler = container[handlerName];
    if (handler) {
        // Workaround to keep arrays not associative
        var data = JSON.parse(JSON.stringify(message.data));
        handler(data);
    }
}

function flashBridgeSubscribe(name) {
    if (handlerName) return;

    handlerName = name;
    var frameWindow = frame.contentWindow;
    if (frameWindow.addEventListener) {
        frameWindow.addEventListener('message', onMessage);
    } else {
        frameWindow.attachEvent('onmessage', onMessage); // IE 8
    }
}

function flashBridgeUnsubscribe(name) {
    if (!handlerName) return;

    handlerName = null;
    var frameWindow = frame.contentWindow;
    if (frameWindow.removeEventListener) {
        frameWindow.removeEventListener('message', onMessage);
    } else {
        frameWindow.detachEvent('onmessage', onMessage); // IE 8
    }
}

function flashBridgeBroadcast(data) {
    var targets = [root];
    while (targets.length > 0) {
        var target = targets.shift();
        if (target.length > 0) {
            var frame = getFrame(target);
            for (var i = 0; i < target.length; ++i) {
                var item = target[i];
                if (item !== frame) targets.push(item);
            }
            if (frame) frame.postMessage(data, '*');
        }
    }
}

// Workaround for missing attribute error in local filesystem
function getFrame(target) {
    var frame;
    try {
        frame = target[FRAME_NAME];
    } catch(err) { }
    return frame;
}
