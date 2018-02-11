let {dateUtils} = require('./dateutils');
let {tools} = require("./tools");

/**
 * 控制台日志类 
 */
class LogConsole {
    constructor(paramName = '') {
        this.m_name = paramName;
    }

    get name() {
        return this.m_name;
    }

    set name(paramName) {
        this.m_name = paramName;
    }
	/**
	 * 
	 * @param {string} categoryName 
	 * @param {string} level 
	 * @param {object} data 
	 */
    buildLog(categoryName, level, data) {
        return `[${categoryName} ${dateUtils.nowDateString()} ${level}] ${data}`;
    }

	trace(paramLog) {
        console.log( this.buildLog(this.name, "TRACE", paramLog));
	}
	debug(paramLog) {
        console.log(this.buildLog(this.name, "DEBUG", paramLog));
	}
	info(paramLog) {
        console.log(this.buildLog(this.name, " INFO", paramLog));
	}
	warn(paramLog) {
        console.log(this.buildLog(this.name, " WARN", paramLog));
	}
	error(paramLog) {
        console.log(this.buildLog(this.name, "ERROR", paramLog));
	}
	fatal(paramLog) {
        console.log(this.buildLog(this.name, "FATEL", paramLog));
	}    

}

let log = new LogConsole("default");

/**
 * 日志管理器
 *
 * @class LogManager
 */
class LogManager {
	/** @constructor */
	constructor() {
		this.m_MapLogger = new Map();
	}
	getLogger(tag) {
		if (tools.isString(tag) && tag.length > 0) {
            let l = this.m_MapLogger.get(tag);
            
			if (tools.isNull(l)) {
                l = new LogConsole(tag);
                
				this.m_MapLogger.set(tag, l);
			}
			return l;
		}
		else {
			return log;
		}
	}
}

let logManager = new LogManager();


function getLogger(paramName) {
    return logManager.getLogger(paramName);
}

exports.getLogger = getLogger;

