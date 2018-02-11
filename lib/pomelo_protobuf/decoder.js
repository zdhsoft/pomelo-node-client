const {codec} = require('./codec');
const util = require('./util');

/**
 * CDecoder
 */
class CDecoder {
	constructor() {
		this.buffer = null;
		this.offset = 0;
		this.protos = {};
	}

	init(protos){
		this.protos = protos || {};
	}
	
	setProtos (protos){
		if(!util.isNull(protos)){
			this.protos = protos;
		}
	}


	decode (route, buf){
		let protos = this.protos[route];
	
		this.buffer = buf;
		this.offset = 0;
	
		if(!util.isNull(protos)){
			return this.decodeMsg({}, protos, this.buffer.length);
		}
	
		return null;
	}

	isFinish(msg, protos){
		return !protos.__tags[this.peekHead().tag];
	}
		

	decodeMsg(msg, protos, length){
		while(this.offset<length){
			let head = this.getHead();
			//let type = head.type;
			let tag = head.tag;
			let name = protos.__tags[tag];
	
			switch(protos[name].option){
				case 'optional' :
				case 'required' :
					msg[name] = this.decodeProp(protos[name].type, protos);
				break;
				case 'repeated' :
					if(!msg[name]){
						msg[name] = [];
					}
					this.decodeArray(msg[name], protos[name].type, protos);
				break;
				default:
				break;
			}
		}
	
		return msg;
	}
	getHead(){
		let tag = codec.decodeUInt32(this.getBytes());

		return {
			type : tag&0x7,
			tag	: tag>>3
		};
	}	
	peekHead(){
		let tag = codec.decodeUInt32(this.peekBytes());

		return {
			type : tag&0x7,
			tag	: tag>>3
		};
	}	
		
	decodeProp(type, protos){
		switch(type){
			case 'uInt32':
				return codec.decodeUInt32(this.getBytes());
			case 'int32' :
			case 'sInt32' :
				return codec.decodeSInt32(this.getBytes());
			case 'float' : {
				let float = this.buffer.readFloatLE(this.offset);

				this.offset += 4;
				return float;
			}
			case 'double' : {
				let double = this.buffer.readDoubleLE(this.offset);

				this.offset += 8;
				return double;
			}
			case 'string' : {
				let length = codec.decodeUInt32(this.getBytes());
	
				let str = this.buffer.toString('utf8', this.offset, this.offset + length);
				
				this.offset += length;
				return str;
			}
			default : {
				let message = protos && (protos.__messages[type] || this.protos['message ' + type]);

				if(message){
					let length = codec.decodeUInt32(this.getBytes());
					let msg = {};

					this.decodeMsg(msg, message, this.offset+length);
					return msg;
				}
			}
			break;
		}
	}

	decodeArray(array, type, protos){
		if(util.isSimpleType(type)){
			let length = codec.decodeUInt32(this.getBytes());
	
			for(let i = 0; i < length; i++){
				array.push(this.decodeProp(type));
			}
		}else{
			array.push(this.decodeProp(type, protos));
		}
	}	
	
	getBytes(flag){
		let bytes = [];
		let pos = this.offset;
		
		flag = flag || false;
	
		let b = 0;

		do{
			b = this.buffer.readUInt8(pos);
			bytes.push(b);
			pos++;
		}while(b >= 128);
	
		if(!flag){
			this.offset = pos;
		}
		return bytes;
	}
	
	peekBytes(){
		return this.getBytes(true);
	}	
		
}

exports.CDecoder = CDecoder;
