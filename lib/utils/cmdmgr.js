class CCmdMgr {
    constructor() {
        this.m_CmdMap = new Map();   //cmd--->{cmd, function, help}
    }

    registerCmd(cmd, cmdCall, help) {
        if(Array.isArray(cmd)) {
            for(let i = 0; i < cmd.length; i++) {
                this.m_CmdMap.set(cmd[i], { cmd:cmdCall, help: help });
            }
        }
        else this.m_CmdMap.set(cmd, { cmd:cmdCall, help: help });
    }

    get CmdMap() {
        return this.m_CmdMap;
    }
}

let CmdMgr = new CCmdMgr();
exports.CmdMgr = CmdMgr;