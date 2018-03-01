const Protocol = require('pomelo-protocol');
const events = require('events');
const WebSocket = require('ws');
const { getLogger,tools } = require('../utils');
let {CProtobuf} = require('../pomelo_protobuf/protobuf');
let log = getLogger("pomeloex");

//一组常量
const JS_WS_CLIENT_TYPE = 'js-websocket';
const JS_WS_CLIENT_VERSION = '0.0.1';
const RES_OK = 200;
//const RES_FAIL = 500;
const RES_OLD_CLIENT = 501;

const Package = Protocol.Package;
const Message = Protocol.Message;


class CPomeloEx extends events.EventEmitter{
    constructor() {
        super();
        this.socket = null;
        this.reqId  = 0;
        this.callbacks = {};
        this.handlers = {};
        this.routeMap = {},
        this.heartbeatInterval = 0;
        this.heartbeatTimeout = 0;
        this.nextHeartbeatTimeout = 0;
        this.gapThreshold = 100;   // heartbeat gap threashold
        this.heartbeatId = null;
        this.heartbeatTimeoutId = null;
        this.handshakeCallback = null;
        this.initCallback = null;
        this.data = {};
        this.handler = {};
        this.protobuf = new CProtobuf();
        this.handshakeBuffer = { 
            'sys': { type: JS_WS_CLIENT_TYPE, version: JS_WS_CLIENT_VERSION},
            'user': {}
        };   
        
        let self = this;

        this.handlers[Package.TYPE_HANDSHAKE] = (paramData) => { self.handshake(paramData); };
        this.handlers[Package.TYPE_HEARTBEAT] = (paramData) => { self.heartbeat(paramData); };
        this.handlers[Package.TYPE_DATA]      = (paramData) => { self.onData(paramData); };
        this.handlers[Package.TYPE_KICK]      = (paramData) => { self.onKick(paramData); };
    }

    init(cb, params) {
        this.initCallback = cb;
        let host = params.host;
        let port = params.port;
        let url  = 'ws://' + host;
    
        if (port) {
            url += ':' + port;
        }
    
        this.handshakeBuffer.user = params.user;
        this.handshakeCallback    = params.handshakeCallback;
        this.initWebSocket(url, cb);
    }    

    initWebSocket (paramURL, paramCB) {
        log.info('connect to ' + paramURL);
        let self = this;
    
        let onOpen =  (/*event*/)=> {
            let obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(self.handshakeBuffer)));
            self.send(obj);
        };
    
        let onMessage = (event) => {
            if (self.socket) {
                self.processPackage(Package.decode(event.data), paramCB);
                if (self.heartbeatTimeout) {
                    self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout;
                }
            }
        };

        let onError = (event) => {
            if (self.socket) {
                self.emit('io-error', event);
                log.error('socket error: ', event);
            }
        };
    
        let onClose = (event) => {
            if (self.socket) {
                self.emit('close', event);
                log.error('socket close: ', event);
            }
        };
    
        this.socket = new WebSocket(paramURL);
        this.socket.binaryType = 'arraybuffer';
        this.socket.onopen     = onOpen;
        this.socket.onmessage  = onMessage;
        this.socket.onerror    = onError;
        this.socket.onclose    = onClose;
    } 

    disconnect() {
        if (this.socket) {
            if (this.socket.disconnect) {
                this.socket.disconnect();
            }
            if (this.socket.close) {
                this.socket.close();
            }
            log.info('disconnect');
            this.socket = null;
        }

        if (this.heartbeatId) {
            clearTimeout(this.heartbeatId);
            this.heartbeatId = null;
        }
        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }

        this.data = {};
        this.protobuf.reset();
        this.initCallback = null;

        this.callbacks = {};
        this.routeMap  = {};

        this.reqId                = 0;
        this.heartbeatInterval    = 0;
        this.heartbeatTimeout     = 0;
        this.nextHeartbeatTimeout = 0;
        this.gapThreshold         = 100;
    }

    request(cb, route, msg) {
        if (arguments.length === 2 && typeof msg === 'function') {
            cb = msg;
            msg = {};
        } else {
            msg = msg || {};
        }
        route = route || msg.route;
        if (!route) {
            return;
        }
        this.reqId++;
        this.sendMessage(this.reqId, route, msg);

        this.callbacks[this.reqId] = cb;
        this.routeMap[this.reqId] = route;
    }

    notify(route, msg) {
        msg = msg || {};
        this.reqId++;
        this.sendMessage(this.reqId, route, msg);
    } 
    
    sendMessage(reqId, route, msg) {
        let type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

        //compress message by protobuf
        let protos = {};

        if (!tools.isNull(this.data.protos)) {
            protos = this.data.protos.client;
        }


        if (!tools.isNull(protos[route])) {
            msg = this.protobuf.encode(route, msg);
        } else {
            msg = Protocol.strencode(JSON.stringify(msg));
        }

        let compressRoute = 0;
        let dict = {};

        if (!tools.isNull(this.data.dict)) {
            dict = this.data.dict;
        }

        if (!tools.isNull(dict[route])) {
            route = dict[route];
            compressRoute = 1;
        }

        msg = Message.encode(reqId, type, compressRoute, route, msg);
        let packet = Package.encode(Package.TYPE_DATA, msg);

        this.send(packet);
    }
    
    send(packet) {
        this.socket.send(packet.buffer);
    }

    heartbeat(/*data*/) {
        let self = this;

        if (!this.heartbeatInterval) {
            return;
        }
    
        let obj = Package.encode(Package.TYPE_HEARTBEAT);

        if (this.heartbeatTimeoutId) {
            clearTimeout(this.heartbeatTimeoutId);
            this.heartbeatTimeoutId = null;
        }
    
        if (this.heartbeatId) {
            return;
        }

        let heartbeatTimeoutCb = () => {
            if (self.socket) {
                let gap = self.nextHeartbeatTimeout - Date.now();

                if (gap > self.gapThreshold) {
                    self.heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, gap);
                } else {
                    log.error('server heartbeat timeout');
                    self.emit('heartbeat timeout');
                    self.disconnect();
                }
            }
        };        
    
        this.heartbeatId = setTimeout(()=>{
            if (self.socket) {
                self.heartbeatId = null;
                self.send(obj);

                self.nextHeartbeatTimeout = Date.now() + self.heartbeatTimeout;
                self.heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, self.heartbeatTimeout);
            }

        }, self.heartbeatInterval);
    }

    handshake(data) {
        data = JSON.parse(Protocol.strdecode(data));
        if (data.code === RES_OLD_CLIENT) {
            this.emit('error', 'client version not fullfill');
            return;
        }
    
        if (data.code !== RES_OK) {
            this.emit('error', 'handshake fail');
            return;
        }
    
        this.handshakeInit(data);
    
        let obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);

        this.send(obj);

        if (this.initCallback) {
            this.initCallback(this.socket);
            this.initCallback = null;
        }
    }

    onData (data) {
        //probuff decode
        let msg = Message.decode(data);

        if (msg.id > 0) {
            msg.route = this.routeMap[msg.id];
            delete this.routeMap[msg.id];
            if (!msg.route) {
                return;
            }
        }
    
        msg.body = this.deCompose(msg);
        this.processMessage(msg);
    }
    onKick(/*data*/) {
        this.emit('onKick');
    }
    
    processPackage (msg) {
        this.handlers[msg.type](msg.body);
    }

    processMessage(msg) {
        if (!msg.id) {
            // server push message
            this.emit(msg.route, msg.body);
            return;
        }
    
        //if have a id then find the callback function with the request
        let cb = this.callbacks[msg.id];

        delete this.callbacks[msg.id];
        if (typeof cb !== 'function') {
            return;
        }
    
        cb(msg.body);
        return;
    }

    processMessageBatch (msgs) {
        for (let i = 0, l = msgs.length; i < l; i++) {
            this.processMessage(msgs[i]);
        }
    }

    deCompose(msg) {
        let protos = {};

        if(!tools.isNull(this.data.protos)) {
            protos = this.data.protos.server;
        }
        let abbrs = this.data.abbrs;

        let route = msg.route;
    
        //Decompose route from dict
        if (msg.compressRoute) {
            if (!abbrs[route]) {
                return {};
            }
    
            route = msg.route = abbrs[route];
        }
        if (!tools.isNull(protos[route])) {
            return this.protobuf.decode(route, msg.body);
        } else {
            return JSON.parse(Protocol.strdecode(msg.body));
        }
    }

    handshakeInit (data) {
        if (data.sys && data.sys.heartbeat) {
            this.heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
            this.heartbeatTimeout = this.heartbeatInterval * 2;        // max heartbeat timeout
        } else {
            this.heartbeatInterval = 0;
            this.heartbeatTimeout = 0;
        }
    
        this.initData(data);
    
        if (typeof this.handshakeCallback === 'function') {
            this.handshakeCallback(data.user);
        }
    }

//Initilize data used in pomelo client
    initData(data) {
        if (!data || !data.sys) {
            return;
        }
        this.data = this.data || {};
        let dict = data.sys.dict;
        let protos = data.sys.protos;

        //Init compress dict
        if (dict) {
            this.data.dict = dict;
            this.data.abbrs = {};

            for (let route in dict) {
                this.data.abbrs[dict[route]] = route;
            }
        }

        //Init protobuf protos
        if (protos) {
            this.data.protos = {
                server: protos.server || {},
                client: protos.client || {}
            };
            if (!tools.isNull(this.protobuf)) {
                this.protobuf.init({
                    encoderProtos: protos.client,
                    decoderProtos: protos.server
                });
            }
        }
    }    
}
/** 原用的CPomeloClient在disconnect的时 */
exports.CPomeloEx = CPomeloEx;