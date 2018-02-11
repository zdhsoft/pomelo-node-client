let {CEncoder} = require('./encoder');
let {CDecoder} = require('./decoder');
let {CParser} = require('./parser');
let util = require("./util");

/**
 * CProtobuf
 */
class CProtobuf {
	constructor() {
		this.encoder = new CEncoder();
		this.decoder = new CDecoder();
		this.parser  = new CParser();
	}
	encode(key, msg){
		return this.encoder.encode(key, msg);
	}

	encode2Bytes (key, msg){
		let buffer = this.encode(key, msg);

		if(!buffer || !buffer.length){
			console.warn('encode msg failed! key : %j, msg : %j', key, msg);
			return null;
		}
		let bytes = new Uint8Array(buffer.length);

		for(let offset = 0; offset < buffer.length; offset++){
			bytes[offset] = buffer.readUInt8(offset);
		}
	
		return bytes;
	}

	encodeStr(key, msg, code) {
		code = code || 'base64';
		let buffer = this.encode(key, msg);

		return !util.isNull(buffer) ? buffer.toString(code) : buffer;
	}
	decode(key, msg){
		return this.decoder.decode(key, msg);
	}
	
	decodeStr(key, str, code) {
		code = code || 'base64';
		let buffer = new Buffer(str, code);

		return !util.isNull(buffer) ? this.decode(key, buffer) : buffer;
	}

	parse (json){
		return this.parser.parse(json);
	}
	
	setEncoderProtos (protos){
		this.encoder.init(protos);
	}
	
	setDecoderProtos(protos){
		this.decoder.init(protos);
	}
	
	init(opts){
		//On the serverside, use serverProtos to encode messages send to client
		this.encoder.init(opts.encoderProtos);
		//On the serverside, user clientProtos to decode messages receive from clients
		this.decoder.init(opts.decoderProtos);
	}
}

exports.CProtobuf = CProtobuf;







