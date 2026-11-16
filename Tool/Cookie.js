#!name=Paperclip · Cookie 抓取合集
#!desc=抓取 paperclip 全部在用签到脚本的 Cookie。打开本插件，进要用的 App 或小程序页面，收到「✅ <名称> Cookie 获取成功」后关掉本插件，避免一直解密这些域名。签到用「Paperclip · 签到合集」。
#!author=MaYIHEI
#!homepage=https://github.com/MaYIHEI/paperclip/tree/main/loon/paperclip-cookie
#!icon=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/paperclip-cookie.png
#!loon_version = 3.5.1(983)
#!tag=签到, Cookie

[rewrite_local]
^https:\/\/pbaccess\.video\.qq\.com\/ url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tenvideo/tenvideo.js
^https:\/\/u6\.y\.qq\.com\/cgi-bin\/musics\.fcg\?.*(EveryDaySignLvzScore|GetSignInSummary) url script-request-body https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/qqmusic/qqmusic.js

[MITM]
hostname = pbaccess.video.qq.com,vip.video.qq.com,u6.y.qq.com
