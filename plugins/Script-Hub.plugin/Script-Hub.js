#!name=Script Hub: 重写 & 规则集转换
#!desc=https://script.hub
#!author=@小白脸 @xream @keywos @ckyb
#!tag=工具
#!homepage=https://github.com/Script-Hub-Org/Script-Hub/tree/main
#!openurl=https://script.hub/
#!icon=https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/assets/icon-dark.png
#!select=启用插件随机图标, 启用, 禁用
#!select=替换原始插件图标, 启用, 禁用
#!select=插件随机图标合集, Doraemon(100P),Shin-chan(100P),Weslie-Wolffy(100P),Tom-Jerry(100P),Genshin(160P),Shin-Miya(100P),OnePiece(100P),Stitch(100P),Pokemon(112P),PokemonGif(56P),Digimon(56P),Transformers(48P),Maruko-chan(100P),AttackOnTitan(84P),Naruto(284P)
#!select=ScriptHub通知, 开启通知, 关闭通知, 跟随链接
#!input=Parser_body_max
#!input=Parser_http_timeout

[General]
force-http-engine-hosts = script.hub, *.script.hub

[Rule]
DOMAIN,scripthub.vercel.app,🕹 终极清单

[Script]
http-request ^https?:\/\/script\.hub\/($|edit\/|reload) script-path=https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/script-hub.js, timeout=300, tag=Script Hub: 前端

http-request ^https?:\/\/script\.hub\/file\/_start_\/.+type=(?:qx-rewrite|surge-module|loon-plugin|all-module) script-path=https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/Rewrite-Parser.js, timeout=300, tag=Script Hub: 重写转换

http-request ^https?:\/\/script\.hub\/file\/_start_\/.+type=rule-set script-path=https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/rule-parser.js, timeout=300, tag=Script Hub: 规则集转换

http-request ^https?:\/\/script\.hub\/convert\/ script-path=https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/script-converter.js, timeout=300, tag=Script Hub: 脚本转换

[MITM]
hostname = script.hub, *.script.hub
