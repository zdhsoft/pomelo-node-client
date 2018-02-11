/**
 * Encoder
 */
class codec {

	/**
	 * [encode an uInt32, return a array of bytes]
	 * @param  {number} num ff
	 * @return {[array]} eturn a array of bytes
	 */
	static encodeUInt32(num) {
		let n = parseInt(num);

		if (isNaN(n) || n < 0) {
			console.log(n);
			return null;
		}

		let result = [];

		do {
			let tmp = n % 128;
			let next = Math.floor(n / 128);

			if (next !== 0) {
				tmp = tmp + 128;
			}
			result.push(tmp);
			n = next;
		} while (n !== 0);

		return result;
	}

	/**
	 * [encode a sInt32, return a byte array]
	 * @param  {[sInt32]} num  The sInt32 need to encode
	 * @return {[array]} A byte array represent the integer
	 */
	static encodeSInt32(num) {
		let n = parseInt(num);

		if (isNaN(n)) {
			return null;
		}
		n = n < 0 ? Math.abs(n) * 2 - 1 : n * 2;

		return this.encodeUInt32(n);
	}

	static decodeUInt32(bytes) {
		let n = 0;

		for (let i = 0; i < bytes.length; i++) {
			let m = parseInt(bytes[i]);

			n = n + (m & 0x7f) * Math.pow(2, 7 * i);
			if (m < 128) {
				return n;
			}
		}

		return n;
	}


	static decodeSInt32 (bytes) {
		let n = this.decodeUInt32(bytes);
		let flag = n % 2 === 1 ? -1 : 1;

		n = (n % 2 + n) / 2 * flag;

		return n;
	}
}

module.exports.codec = codec;
