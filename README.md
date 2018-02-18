
# pomelo-node-client
在nodejs下运行的pomelo客户端。这个是控制台方式运行的。可以创建多个pomelo运行，这样可以便于测试！
- 将依赖的protobuf和protocol这两个库，移入到代码，便于修改。
- 运行环境 nodejs 8.x，如需低版本运行，请用babel编译成低版本 具体参考：http://blog.csdn.net/zdhsoft/article/details/54571623 也可以用babel直接编译。

# 命令行输入
这里还增加了一个easy的命令行输入解析调用，可以用CmdRegister来注册你的命令，这样就可以手动输入你的命令，来灵活的测试了。

# 来源
这个是从pomelo jsclient修改过来的。
https://github.com/pomelonode/pomelo-jsclient-websocket
