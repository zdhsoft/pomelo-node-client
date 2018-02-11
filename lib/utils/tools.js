let _ = require("lodash");

/**
 * 一些工具类
 */
class tools {
    /**
     *  异步调用函数
     * @param {function} paramFunc 要调用的函数
     * @param {*} args 要调用的参数
     * @return {Promise} 返回Promise对象
     */
    static async WaitFuncion(paramFunc, ...args) {
		return new Promise((resolve) => {
			paramFunc((...result) => {
				resolve([...result]);
			}, ...args);
		});
    }

    static async sleep(paramT) {
        await this.WaitFuncion(setTimeout, paramT);
    }

    static async WaitClassFunction(paramObject, paramFunction, ...args) {
		return new Promise((resolve) => {
			paramObject[paramFunction]((...result) => {
				resolve([...result]);
			}, ...args);
		});        
    }

    static isNull(v) {
        return v === null || v === undefined;
    }

    static isString(v) {
        return _.isString(v);
    }
}

exports.tools = tools;