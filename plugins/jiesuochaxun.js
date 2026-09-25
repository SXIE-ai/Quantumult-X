/***

Thanks to & modified from 
1. https://gist.githubusercontent.com/Hyseen/b06e911a41036ebc36acf04ddebe7b9a/raw/nf_check.js
2. https://github.com/AtlantisGawrGura/Quantumult-X-Scripts/blob/main/media.js
3. https://github.com/CoiaPrant/MediaUnlock_Test/blob/main/check.sh
4. https://github.com/Netflixxp/chatGPT/blob/main/chat.sh

For Quantumult-X 598+ ONLY!!

2024 更新：新增 Gemini (Bard) 解锁检测

[task_local]

event-interaction https://raw.githubusercontent.com/KOP-XIAO/QuantumultX/master/Scripts/streaming-ui-check.js, tag=流媒体-解锁查询, img-url=checkmark.seal.system, enabled=true

@XIAO_KOP

**/

const BASE_URL = 'https://www.netflix.com/title/';
const BASE_URL_YTB = "https://www.youtube.com/premium";
const BASE_URL_DISNEY = 'https://www.disneyplus.com';
const BASE_URL_Dazn = "https://startup.core.indazn.com/misl/v5/Startup";
const BASE_URL_Param = "https://www.paramountplus.com/";
const FILM_ID = 81280792;
const BASE_URL_Discovery_token = "https://us1-prod-direct.discoveryplus.com/token?deviceId=d1a4a5d25212400d1e6985984604d740&realm=go&shortlived=true";
const BASE_URL_Discovery = "https://us1-prod-direct.discoveryplus.com/users/me";
const BASE_URL_GPT = 'https://chat.openai.com/';
const Region_URL_GPT = 'https://chat.openai.com/cdn-cgi/trace';
const BASE_URL_GEMINI = 'https://gemini.google.com/';

const link = { "media-url": "https://raw.githubusercontent.com/KOP-XIAO/QuantumultX/master/img/southpark/7.png" };
const policy_name = "Netflix"; //填入你的 netflix 策略组名

const arrow = " ➟ ";

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36';

// 即将登陆
const STATUS_COMING = 2;
// 支持解锁
const STATUS_AVAILABLE = 1;
// 不支持解锁
const STATUS_NOT_AVAILABLE = 0;
// 检测超时
const STATUS_TIMEOUT = -1;
// 检测异常
const STATUS_ERROR = -2;

var opts = {
  policy: $environment.params
};

var opts1 = {
  policy: $environment.params,
  redirection: false
};

var flags = new Map([[ "AC" , "🇦🇨" ] ,["AE","🇦🇪"], [ "AF" , "🇦🇫" ] , [ "AI" , "🇦🇮" ] , [ "AL" , "🇦🇱" ] , [ "AM" , "🇦🇲" ] , [ "AQ" , "🇦🇶" ] , [ "AR" , "🇦🇷" ] , [ "AS" , "🇦🇸" ] , [ "AT" , "🇦🇹" ] , [ "AU" , "🇦🇺" ] , [ "AW" , "🇦🇼" ] , [ "AX" , "🇦🇽" ] , [ "AZ" , "🇦🇿" ] , ["BA", "🇧🇦"], [ "BB" , "🇧🇧" ] , [ "BD" , "🇧🇩" ] , [ "BE" , "🇧🇪" ] , [ "BF" , "🇧🇫" ] , [ "BG" , "🇧🇬" ] , [ "BH" , "🇧🇭" ] , [ "BI" , "🇧🇮" ] , [ "BJ" , "🇧🇯" ] , [ "BM" , "🇧🇲" ] , [ "BN" , "🇧🇳" ] , [ "BO" , "🇧🇴" ] , [ "BR" , "🇧🇷" ] , [ "BS" , "🇧🇸" ] , [ "BT" , "🇧🇹" ] , [ "BV" , "🇧🇻" ] , [ "BW" , "🇧🇼" ] , [ "BY" , "🇧🇾" ] , [ "BZ" , "🇧🇿" ] , [ "CA" , "🇨🇦" ] , [ "CF" , "🇨🇫" ] , [ "CH" , "🇨🇭" ] , [ "CK" , "🇨🇰" ] , [ "CL" , "🇨🇱" ] , [ "CM" , "🇨🇲" ] , [ "CN" , "🇨🇳" ] , [ "CO" , "🇨🇴" ] , [ "CP" , "🇨🇵" ] , [ "CR" , "🇨🇷" ] , [ "CU" , "🇨🇺" ] , [ "CV" , "🇨🇻" ] , [ "CW" , "🇨🇼" ] , [ "CX" , "🇨🇽" ] , [ "CY" , "🇨🇾" ] , [ "CZ" , "🇨🇿" ] , [ "DE" , "🇩🇪" ] , [ "DG" , "🇩🇬" ] , [ "DJ" , "🇩🇯" ] , [ "DK" , "🇩🇰" ] , [ "DM" , "🇩🇲" ] , [ "DO" , "🇩🇴" ] , [ "DZ" , "🇩🇿" ] , [ "EA" , "🇪🇦" ] , [ "EC" , "🇪🇨" ] , [ "EE" , "🇪🇪" ] , [ "EG" , "🇪🇬" ] , [ "EH" , "🇪🇭" ] , [ "ER" , "🇪🇷" ] , [ "ES" , "🇪🇸" ] , [ "ET" , "🇪🇹" ] , [ "EU" , "🇪🇺" ] , [ "FI" , "🇫🇮" ] , [ "FJ" , "🇫🇯" ] , [ "FK" , "🇫🇰" ] , [ "FM" , "🇫🇲" ] , [ "FO" , "🇫🇴" ] , [ "FR" , "🇫🇷" ] , [ "GA" , "🇬🇦" ] , [ "GB" , "🇬🇧" ] , [ "HK" , "🇭🇰" ] ,["HU","🇭🇺"], [ "ID" , "🇮🇩" ] , [ "IE" , "🇮🇪" ] , [ "IL" , "🇮🇱" ] , [ "IM" , "🇮🇲" ] , [ "IN" , "🇮🇳" ] , [ "IS" , "🇮🇸" ] , [ "IT" , "🇮🇹" ] , [ "JP" , "🇯🇵" ] , [ "KR" , "🇰🇷" ] , [ "LU" , "🇱🇺" ] , [ "MO" , "🇲🇴" ] , [ "MX" , "🇲🇽" ] , [ "MY" , "🇲🇾" ] , [ "NL" , "🇳🇱" ] , [ "PH" , "🇵🇭" ] , [ "RO" , "🇷🇴" ] , [ "RS" , "🇷🇸" ] , [ "RU" , "🇷🇺" ] , [ "RW" , "🇷🇼" ] , [ "SA" , "🇸🇦" ] , [ "SB" , "🇸🇧" ] , [ "SC" , "🇸🇨" ] , [ "SD" , "🇸🇩" ] , [ "SE" , "🇸🇪" ] , [ "SG" , "🇸🇬" ] , [ "TH" , "🇹🇭" ] , [ "TN" , "🇹🇳" ] , [ "TO" , "🇹🇴" ] , [ "TR" , "🇹🇷" ] , [ "TV" , "🇹🇻" ] , [ "TW" , "🇨🇳" ] , [ "UK" , "🇬🇧" ] , [ "UM" , "🇺🇲" ] , [ "US" , "🇺🇸" ] , [ "UY" , "🇺🇾" ] , [ "UZ" , "🇺🇿" ] , [ "VA" , "🇻🇦" ] , [ "VE" , "🇻🇪" ] , [ "VG" , "🇻🇬" ] , [ "VI" , "🇻🇮" ] , [ "VN" , "🇻🇳" ] , [ "ZA" , "🇿🇦"]]);

let result = {
  "title": '    📺  流媒体服务查询',
  "YouTube": '<b>YouTube: </b>检测失败，请重试 ❗️',
  "Netflix": '<b>Netflix: </b>检测失败，请重试 ❗️',
  "Dazn": "<b>Dazn: </b>检测失败，请重试 ❗️",
  "Disney": "<b>Disneyᐩ: </b>检测失败，请重试 ❗️",
  "Paramount" : "<b>Paramountᐩ: </b>检测失败，请重试 ❗️",
  "Discovery" : "<b>Discoveryᐩ: </b>检测失败，请重试 ❗️",
  "ChatGPT" : "<b>ChatGPT: </b>检测失败，请重试 ❗️",
  "Gemini" : "<b>Gemini: </b>检测失败，请重试 ❗️"
};

const message = {
  action: "get_policy_state",
  content: $environment.params
};

;(async () => {
  testYTB();
  testDazn();
  testParam();
  let [{ region, status }] = await Promise.all([testDisneyPlus(), testNf(FILM_ID), testDiscovery(), testChatGPT(), testGemini()]);
  
  if (status == STATUS_COMING) {
    result["Disney"] = "<b>Disneyᐩ:</b> 即将登陆 ➟ "+'⟦'+flags.get(region.toUpperCase())+"⟧ ⚠️";
  } else if (status == STATUS_AVAILABLE){
    result["Disney"] = "<b>Disneyᐩ:</b> 支持 ➟ "+'⟦'+flags.get(region.toUpperCase())+"⟧ 🎉";
  } else if (status == STATUS_NOT_AVAILABLE) {
    result["Disney"] = "<b>Disneyᐩ:</b> 未支持 🚫 ";
  } else if (status == STATUS_TIMEOUT) {
    result["Disney"] = "<b>Disneyᐩ:</b> 检测超时 🚦 ";
  }

  $configuration.sendMessage(message).then(resolve => {
    if (resolve.error) {
      console.log(resolve.error);
      $done();
    }
    if (resolve.ret) {
      let output = JSON.stringify(resolve.ret[message.content]) ? JSON.stringify(resolve.ret[message.content]).replace(/\"|\[\vert{}\]/g,"").replace(/\,/g," ➟ ") : $environment.params;
      let content = "--------------------------------------</br>" + ([result["Dazn"], result["Discovery"], result["Paramount"], result["Disney"], result["ChatGPT"], result["Gemini"], result["Netflix"], result["YouTube"]]).join("</br></br>");
      content = content + "</br>--------------------------------------</br>" + "<font color=#CD5C5C>" + "<b>节点</b> ➟ " + output + "</font>";
      content = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">` + content + `</p>`;
      console.log(output);
      $done({"title": result["title"], "htmlMessage": content});
    }
  }, reject => {
    $done();
  });  
})()
.finally(() => {
  $configuration.sendMessage(message).then(resolve => {
    if (resolve.error) {
      console.log(resolve.error);
      $done();
    }
    if (resolve.ret) {
      let output = JSON.stringify(resolve.ret[message.content]) ? JSON.stringify(resolve.ret[message.content]).replace(/\"|\[\vert{}\]/g,"").replace(/\,/g," ➟ ") : $environment.params;
      let content = "--------------------------------------</br>" + ([result["Dazn"], result["Discovery"], result["Paramount"], result["Disney"], result["ChatGPT"], result["Gemini"], result["Netflix"], result["YouTube"]]).join("</br></br>");
      content = content + "</br>--------------------------------------</br>" + "<font color=#CD5C5C>" + "<b>节点</b> ➟ " + output + "</font>";
      content = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">` + content + `</p>`;
      console.log(output);
      $done({"title": result["title"], "htmlMessage": content});
    }
  }, reject => {
    $done();
  }); 
});

async function testDisneyPlus() {
  try {
    let { region, cnbl } = await Promise.race([testHomePage(), timeout(7000)]);
    let { countryCode, inSupportedLocation, accessToken } = await Promise.race([getLocationInfo(), timeout(7000)]);
    region = countryCode ?? region;
    if (inSupportedLocation === false || inSupportedLocation === 'false') {
      return { region, status: STATUS_COMING };
    } else {
      return { region, status: STATUS_AVAILABLE };
    }
  } catch (error) {
    if (error === 'Not Available') return { status: STATUS_NOT_AVAILABLE };
    if (error === 'Timeout') return { status: STATUS_TIMEOUT };
    return { status: STATUS_ERROR };
  } 
}

function getLocationInfo() {
  return new Promise((resolve, reject) => {
    let opts0 = {
      url: 'https://disney.api.edge.bamgrid.com/graph/v1/device/graphql',
      method: "POST",
      opts: opts,
      headers: {
        'Accept-Language': 'en',
        "Authorization": 'ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84',
        'Content-Type': 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({
        query: 'mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice:$input) { grant { grantType assertion } } }',
        variables: {
          input: {
            applicationRuntime: 'chrome',
            attributes: {
              browserName: 'chrome',
              browserVersion: '94.0.4606',
              manufacturer: 'apple',
              model: null,
              operatingSystem: 'macintosh',
              operatingSystemVersion: '10.15.7',
              osDeviceIds: [],
            },
            deviceFamily: 'browser',
            deviceLanguage: 'en',
            deviceProfile: 'macosx',
          },
        },
      }),
    };
    
    $task.fetch(opts0).then(response => {
      let data = response.body;
      if (response.statusCode !== 200) {
        reject('Not Available');
        return;
      } else {
        let {
          token: { accessToken },
          session: {
            inSupportedLocation,
            location: { countryCode },
          },
        } = JSON.parse(data)?.extensions?.sdk;
        resolve({ inSupportedLocation, countryCode, accessToken });
      }
    }, reason => {
      reject('Error');
    });
  });
}

function testHomePage() {
  return new Promise((resolve, reject) => {
    let opts0 = {
      url: 'https://www.disneyplus.com/',
      opts: opts,
      headers: {
        'Accept-Language': 'en',
        'User-Agent': UA,
      },
    };
    $task.fetch(opts0).then(response => {
      let data = response.body;
      if (response.statusCode !== 200 || data.indexOf('not available in your region') !== -1) {
        reject('Not Available');
        return;
      } else {
        let match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/);
        if (!match) {
          resolve({ region: '', cnbl: '' });
          return;
        } else {
          let region = match[1];
          let cnbl = match[2];
          resolve({ region, cnbl });
        }
      }
    }, reason => {
      reject('Error');
    });
  });
}

function timeout(delay = 5000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('Timeout');
    }, delay);
  });
}

function testNf(filmId) {
  return new Promise((resolve, reject) => {
    let option = {
      url: BASE_URL + filmId,
      opts: opts,
      timeout: 5200,
      headers: {
        'User-Agent': UA,
      },
    };
    $task.fetch(option).then(response => {
      if (response.statusCode === 404) {
        result["Netflix"] = "<b>Netflix: </b>支持自制剧集 ⚠️";
        resolve('Not Found');
        return; 
      } else if (response.statusCode === 403) {
        result["Netflix"] = "<b>Netflix: </b>未支持 🚫";
        resolve('Not Available');
        return;
      } else if (response.statusCode === 200) {
        let url = response.headers['X-Originating-URL'];
        let region = url.split('/')[3];
        region = region.split('-')[0];
        if (region == 'title') {
          region = 'us';
        }
        result["Netflix"] = "<b>Netflix: </b>完整支持" + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
        resolve("nf:" + result["Netflix"]);
        return; 
      }
      resolve("Netflix Test Error");
    }, reason => {
      result["Netflix"] = "<b>Netflix: </b>检测超时 🚦";
      resolve("timeout");
    });
  });
}

function testYTB() { 
  let option = {
    url: BASE_URL_YTB,
    opts: opts,
    timeout: 2800,
    headers: {
      'User-Agent': UA
    },
  };
  $task.fetch(option).then(response => {
    let data = response.body;
    if (response.statusCode !== 200) {
      result["YouTube"] = "<b>YouTube Premium: </b>检测失败 ❗️";
    } else if (data.indexOf('Premium is not available in your country') !== -1) {
      result["YouTube"] = "<b>YouTube Premium: </b>未支持 🚫";
    } else {
      let region = '';
      let re = new RegExp('"GL":"(.*?)"', 'gm');
      let ret = re.exec(data);
      if (ret != null && ret.length === 2) {
        region = ret[1];
      } else if (data.indexOf('www.google.cn') !== -1) {
        region = 'CN';
      } else {
        region = 'US';
      }
      result["YouTube"] = "<b>YouTube Premium: </b>支持 " + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
    }
  }, reason => {
    result["YouTube"] = "<b>YouTube Premium: </b>检测超时 🚦";
  });
}

function testDazn() { 
  const extra = `{
    "LandingPageKey":"generic",
    "Platform":"web",
    "PlatformAttributes":{},
    "Manufacturer":"",
    "PromoCode":"",
    "Version":"2"
  }`;
  let option = {
    url: BASE_URL_Dazn,
    method: "POST",
    opts: opts,
    timeout: 2800,
    headers: {
      'User-Agent': UA,
      "Content-Type": "application/json"
    },
    body: extra
  };

  $task.fetch(option).then(response => {
    let data = response.body;
    if (response.statusCode !== 200) {
      result["Dazn"] = "<b>Dazn: </b>检测失败 ❗️";
    } else {
      let region = '';
      let re = new RegExp('"GeolocatedCountry":"(.*?)"', 'gm');
      let ret = re.exec(data);
      if (ret != null && ret.length === 2) {
        region = ret[1];
        result["Dazn"] = "<b>Dazn: </b>支持 " + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
      } else {
        result["Dazn"] = "<b>Dazn: </b>未支持 🚫";
      }
    }
  }, reason => {
    result["Dazn"] = "<b>Dazn: </b>检测超时 🚦";
  });
}

function testParam() { 
  let option = {
    url: BASE_URL_Param,
    opts: opts1,
    timeout: 2800,
    headers: {
      'User-Agent': UA
    },
  };
  $task.fetch(option).then(response => {
    if (response.statusCode == 200) {
      result["Paramount"] = "<b>Paramountᐩ: </b>支持 🎉 ";
    } else if (response.statusCode == 302) {
      result["Paramount"] = "<b>Paramountᐩ: </b>未支持 🚫";
    } 
  }, reason => {
    result["Paramount"] = "<b>Paramountᐩ: </b>检测超时 🚦";
  });
}

function testDiscovery() {
  return new Promise((resolve, reject) => {
    let option = {
      url: BASE_URL_Discovery_token,
      opts: opts1,
      timeout: 2800,
      headers: {
        'User-Agent': UA
      },
      verify: false
    };
    $task.fetch(option).then(response => {
      if(response.statusCode == 200) {
        let data = JSON.parse(response.body);
        let token = data["data"]["attributes"]["token"];
        const cookievalid = `st=${token};`;
        let option1 = {
          url: BASE_URL_Discovery,
          opts: opts1,
          timeout: 2800,
          headers: {
            'User-Agent': UA,
            "Cookie": cookievalid,
          },
          ciphers: "DEFAULT@SECLEVEL=1",
          verify: false
        };
        $task.fetch(option1).then(response => {
          let data = JSON.parse(response.body);
          let locationd = data["data"]["attributes"]["currentLocationTerritory"];
          if (locationd == "us") {
            result["Discovery"] = "<b>Discoveryᐩ: </b>支持 🎉 ";
            resolve("支持Discoveryᐩ");
          } else {
            result["Discovery"] = "<b>Discoveryᐩ: </b>未支持 🚫";
            resolve("不支持Discoveryᐩ");
          }
        }, reason => {
          resolve("discovery failed");
        });
      } else {
        resolve("discovery failed");
      }
    }, reason => {
      resolve("discovery failed");
    });
  });
}

// OpenAI ChatGPT Test
support_countryCodes = ["T1","XX","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BD","BB","BE","BZ","BJ","BT","BA","BW","BR","BG","BF","CV","CA","CL","CO","KM","CR","HR","CY","DK","DJ","DM","DO","EC","SV","EE","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IQ","IE","IL","IT","JM","JP","JO","KZ","KE","KI","KW","KG","LV","LB","LS","LR","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PE","PH","PL","PT","QA","RO","RW","KN","LC","VC","WS","SM","ST","SN","RS","SC","SL","SG","SK","SI","SB","ZA","ES","LK","SR","SE","CH","TH","TG","TO","TT","TN","TR","TV","UG","AE","US","UY","VU","ZM","BO","BN","CG","CZ","VA","FM","MD","PS","KR","TW","TZ","TL","GB"];

function testChatGPT() {
  return new Promise((resolve, reject) => {
    let option = {
      url: BASE_URL_GPT,
      opts: opts1,
      timeout: 2800,
    };
    $task.fetch(option).then(response => {
      let resp = JSON.stringify(response);
      let jdg = resp.indexOf("text/plain");
      if(jdg == -1) {
        let option1 = {
          url: Region_URL_GPT,
          opts: opts1,
          timeout: 2800,
        };
        $task.fetch(option1).then(response => {
          let region = response.body.split("loc=")[1].split("\n")[0];
          let res = support_countryCodes.indexOf(region);
          if (res != -1) {
            result["ChatGPT"] = "<b>ChatGPT: </b>支持 " + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
            resolve("支持 ChatGPT");
          } else {
            result["ChatGPT"] = "<b>ChatGPT: </b>未支持 🚫";
            resolve("不支持 ChatGPT");
          }
        }, reason => {
          resolve("ChatGPT failed");
        });
      } else {
        result["ChatGPT"] = "<b>ChatGPT: </b>未支持 🚫";
        resolve("不支持 ChatGPT");
      }
    }, reason => {
      resolve("ChatGPT failed");
    });
  });
}

// Google Gemini (Bard) Test
function testGemini() {
  return new Promise((resolve, reject) => {
    let option = {
      url: BASE_URL_GEMINI,
      opts: opts1,
      timeout: 3000,
      headers: {
        'User-Agent': UA
      }
    };
    $task.fetch(option).then(response => {
      if (response.statusCode === 200) {
        let data = response.body || '';
        // 验证 Gemini 是否在该地区受受限限制 (例如 HK/CN 等屏蔽地区会跳转或包含 UNSUPPORTED 标识)
        if (data.indexOf("SNlM0e") !== -1 || data.indexOf("Bard") !== -1 || data.indexOf("Gemini") !== -1) {
          // 进一步通过 Google 节点获取具体地区
          let optTrace = {
            url: "https://www.cloudflare.com/cdn-cgi/trace",
            opts: opts1,
            timeout: 2500
          };
          $task.fetch(optTrace).then(resTrace => {
            let region = "US";
            if (resTrace.statusCode === 200 && resTrace.body.indexOf("loc=") !== -1) {
              region = resTrace.body.split("loc=")[1].split("\n")[0].toUpperCase();
            }
            let flagStr = flags.get(region) ? flags.get(region) : "🌐";
            result["Gemini"] = "<b>Gemini: </b>支持 " + arrow + "⟦" + flagStr + "⟧ 🎉";
            resolve("Gemini Supported");
          }, () => {
            result["Gemini"] = "<b>Gemini: </b>支持 🎉";
            resolve("Gemini Supported");
          });
        } else {
          result["Gemini"] = "<b>Gemini: </b>未支持 🚫";
          resolve("Gemini Not Supported");
        }
      } else if (response.statusCode === 302 || response.statusCode === 403) {
        result["Gemini"] = "<b>Gemini: </b>未支持 🚫";
        resolve("Gemini Not Supported");
      } else {
        result["Gemini"] = "<b>Gemini: </b>检测失败 ❗️";
        resolve("Gemini Check Error");
      }
    }, reason => {
      result["Gemini"] = "<b>Gemini: </b>检测超时 🚦";
      resolve("Gemini Timeout");
    });
  });
}
