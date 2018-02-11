/**
	这里需要node 8.x以上的版本，才可以运行
 */

const {CPomeloClient} = require("./pomelo_websocket");
const {getLogger, tools} = require("./utils");
const readline = require('readline');
const {CmdMgr}= require('./utils/cmdmgr');

let log = getLogger("main");

let pomelo = new CPomeloClient();

pomelo.on('error',(error) => {
    log.error('has error:', error);
});

let rl = readline.createInterface({input:process.stdin, output:process.stdout, prompt:'crm>'});

//进入游戏  guest_id或guest_token 这个是游客登录需要的信息
async function EnterGame(guest_id, guest_token) {
    try {
		//初始化连接 连接到platform 注意：这个key与pomelo服务器上的握手要注意相同
		await tools.WaitClassFunction(pomelo, 'init_ex', { host: "192.168.1.137", port: 7821, log: true, user:{ key:'123456'} });
        //登录 这个请跟据你实际的实现来修改
        let [connectorData] = await tools.WaitClassFunction(pomelo, 'request_ex', 'platform.platformHandler.Author', {type:1, uid:guest_id, tokenlogin:guest_token});
        
        pomelo.disconnect();
        log.info(JSON.stringify(connectorData));
		//连接到connector
        let initAns =await tools.WaitClassFunction(pomelo, 'init_ex', {host:connectorData.host, port:connectorData.port, log:true, user:{ key:'123456'}});
        console.log("initAns", initAns);
        

        let player = null;
        {
            //登录到游戏服务器
            let [ansData] = await tools.WaitClassFunction(pomelo, 'request_ex', 'connector.entryHandler.Login', connectorData);
            
            player = ansData;
        }
        console.log('player:', player);

    }catch(e) {
        pomelo.disconnect();
        log.error('hello error' + e);
    }
}


async function doMain() {
    await tools.sleep(500);
    await EnterGame('test', 'alex_001');  //连接并登录游戏服务器
}

doMain();


/**
 * 打印命令列表
 */
function CmdShowHelp() {
    let cmdmap = CmdMgr.CmdMap;
    for(let [k,v] of cmdmap) {
        console.log(k + ':' + v.help);
    }
};

function cmdTest(paramN, paramN2) {
    console.log('test', paramN, paramN2)
    doMain();
}

/**
 * 一个用于显示参数列表的例子
 * 如输入: simple 1 2 3 4 5
 * @param {Array} args 参数列表
 */
function CmdSimple(...args) {
    console.log("simple: args=", args);
}

CmdMgr.registerCmd('help', CmdShowHelp, ' //显示所有命令帮助');
CmdMgr.registerCmd('simple', CmdSimple, ' //一个用于显示参数列表的例子');
CmdMgr.registerCmd('test', cmdTest, '');


log.info('请输入命令');
rl.prompt();
rl.on('line', (line)=>{
    let m = line.split(' ');
    let params = [];
    for (let s of m) {
        let tmpStr = s.trim();
        if (tmpStr.length > 0) {
            params.push(tmpStr);
        }
    }
    if (params.length > 0) {
        let cmd = params[0];
        let getCmd = CmdMgr.CmdMap.get(cmd);
        if (!getCmd) {
            log.error('错误的命令:', cmd);
        }
        else {
            getCmd.cmd(...params.splice(1));
        }
    }
    rl.prompt();
});


