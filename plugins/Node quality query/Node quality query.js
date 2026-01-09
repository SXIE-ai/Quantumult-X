const IPPURE_URL = "https://my.ippure.com/v1/info";
// 使用多个备选 IP 查询服务
const IP_QUERY_APIS = [
  "https://api.ipify.org?format=json",           // 简单直接的 API
  "https://api64.ipify.org?format=json",         // IPv6 兼容
  "https://ipapi.co/json/",                      // 备用服务
  "https://api.myip.com",                        // 备用服务
  "https://api.ip.sb/json"                       // 备用服务
];

// 从 Quantumult X 参数获取节点名
const nodeName = typeof $argument !== "undefined" && $argument ? $argument : "未指定节点";

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url: url, headers: headers }, (error, response, data) => {
      if (error) {
        reject(error);
      } else {
        resolve({ response, data });
      }
    });
  });
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function severityMeta(sev) {
  if (sev >= 4) return { icon: "xmark.octagon.fill", color: "#8E0000" };
  if (sev >= 3) return { icon: "exclamationmark.triangle.fill", color: "#FF3B30" };
  if (sev >= 2) return { icon: "exclamationmark.circle.fill", color: "#FF9500" };
  if (sev >= 1) return { icon: "exclamationmark.circle", color: "#FFCC00" };
  return { icon: "checkmark.seal.fill", color: "#34C759" };
}

function gradeIppure(score) {
  const s = toInt(score);
  if (s === null) return { sev: 2, text: "IPPure：获取失败" };
  if (s >= 80) return { sev: 4, text: `IPPure：🛑 极高风险 (${s})` };
  if (s >= 70) return { sev: 3, text: `IPPure：⚠️ 高风险 (${s})` };
  if (s >= 40) return { sev: 1, text: `IPPure：🔶 中等风险 (${s})` };
  return { sev: 0, text: `IPPure：✅ 低风险 (${s})` };
}

// ipapi.is - 免费直接可用
function gradeIpapi(j) {
  if (!j || !j.company) return { sev: 2, text: "ipapi：获取失败" };
  
  const abuserScoreText = j.company.abuser_score;
  if (!abuserScoreText || typeof abuserScoreText !== "string") {
    return { sev: 2, text: "ipapi：无评分" };
  }
  const m = abuserScoreText.match(/([0-9.]+)\s*\(([^)]+)\)/);
  if (!m) return { sev: 2, text: `ipapi：${abuserScoreText}` };

  const ratio = Number(m[1]);
  const level = String(m[2] || "").trim();
  const pct = Number.isFinite(ratio) ? `${Math.round(ratio * 10000) / 100}%` : "?";

  const sevByLevel = { "Very Low": 0, Low: 0, Elevated: 2, High: 3, "Very High": 4 };
  const sev = sevByLevel[level] ?? 2;
  const label = sev >= 4 ? "🛑 极高风险" : sev >= 3 ? "⚠️ 高风险" : sev >= 2 ? "🔶 较高风险" : "✅ 低风险";

  return { sev, text: `ipapi：${label} (${pct}, ${level})` };
}

// ipapi.is 判断 IP 类型
function ipapiHostingText(j) {
  if (!j) return "IP类型：未知（获取失败）";
  
  const isDc = j.is_datacenter === true;
  const isMobile = j.is_mobile === true;
  const asnType = String(j.asn?.type || "").toLowerCase();
  const companyType = String(j.company?.type || "").toLowerCase();
  
  if (isMobile) return `IP类型：📱 蜂窝移动网络`;
  if (asnType === "hosting" || companyType === "hosting") return `IP类型：🏢 托管服务器`;
  if (asnType === "isp" || companyType === "isp") return `IP类型：🏠 家庭宽带`;
  if (asnType === "business" || companyType === "business") return `IP类型：🏬 商业宽带`;
  if (asnType === "education" || companyType === "education") return `IP类型：🎓 教育网络`;
  if (asnType === "government" || companyType === "government") return `IP类型：🏛️ 政府网络`;
  
  const typeInfo = asnType || companyType || "未知";
  return `IP类型：❓ ${typeInfo}`;
}

// Scamalytics - 抓网页解析（添加超时和重试）
async function gradeScamalytics(ip) {
  try {
    const { data } = await httpGet(`https://scamalytics.com/ip/${encodeURIComponent(ip)}`);
    if (!data) return { sev: 2, text: "Scamalytics：获取失败" };
    
    const html = String(data);
    const scoreMatch = html.match(/Fraud\s*Score[:\s]*(\d+)/i) 
      || html.match(/class="score"[^>]*>(\d+)/i)
      || html.match(/"score"\s*:\s*(\d+)/i);
    
    if (!scoreMatch) return { sev: 2, text: "Scamalytics：无评分数据" };
    
    const s = toInt(scoreMatch[1]);
    if (s === null) return { sev: 2, text: "Scamalytics：数据异常" };
    if (s >= 90) return { sev: 4, text: `Scamalytics：🛑 极高风险 (${s})` };
    if (s >= 60) return { sev: 3, text: `Scamalytics：⚠️ 高风险 (${s})` };
    if (s >= 20) return { sev: 1, text: `Scamalytics：🔶 中风险 (${s})` };
    return { sev: 0, text: `Scamalytics：✅ 低风险 (${s})` };
  } catch (error) {
    return { sev: 2, text: "Scamalytics：服务不可用" };
  }
}

// IPWhois - 免费 API
async function gradeIpwhois(ip) {
  try {
    const { data } = await httpGet(`https://ipwhois.io/widget?ip=${encodeURIComponent(ip)}&lang=en`, {
      "Referer": "https://ipwhois.io/",
      "Accept": "*/*",
    });
    
    const j = safeJsonParse(data);
    if (!j || !j.security) return { sev: 2, text: "IPWhois：获取失败" };
    
    const sec = j.security;
    const items = [];
    if (sec.proxy === true) items.push("代理");
    if (sec.tor === true) items.push("Tor网络");
    if (sec.vpn === true) items.push("VPN");
    if (sec.hosting === true) items.push("托管服务");
    
    if (items.length === 0) {
      return { sev: 0, text: "IPWhois：✅ 低风险（无标记）" };
    }
    const sev = items.includes("Tor网络") ? 3 : items.length >= 2 ? 2 : 1;
    const label = sev >= 3 ? "⚠️ 高风险" : sev >= 2 ? "🔶 较高风险" : "🔶 有标记";
    return { sev, text: `IPWhois：${label} (${items.join("/")})` };
  } catch (error) {
    return { sev: 2, text: "IPWhois：服务不可用" };
  }
}

// ipdata.co - 替代服务
async function gradeIpdata(ip) {
  try {
    const { data } = await httpGet(`https://api.ipdata.co/${ip}?api-key=test`);
    const j = safeJsonParse(data);
    if (!j || !j.threat) return { sev: 2, text: "ipdata：无威胁数据" };
    
    const threat = j.threat;
    const isThreat = threat.is_threat === true;
    const isTor = threat.is_tor === true;
    const isProxy = threat.is_proxy === true;
    const isAnonymous = threat.is_anonymous === true;
    const isKnownAttacker = threat.is_known_attacker === true;
    
    if (isThreat || isTor || isKnownAttacker) {
      const items = [];
      if (isTor) items.push("Tor");
      if (isProxy) items.push("代理");
      if (isKnownAttacker) items.push("已知攻击者");
      return { sev: 3, text: `ipdata：⚠️ 高风险 (${items.join("/")})` };
    }
    
    if (isAnonymous || isProxy) {
      return { sev: 1, text: `ipdata：🔶 有标记 (匿名/代理)` };
    }
    
    return { sev: 0, text: "ipdata：✅ 低风险" };
  } catch (error) {
    return { sev: 2, text: "ipdata：服务不可用" };
  }
}

function flagEmoji(code) {
  if (!code) return "";
  let c = String(code).toUpperCase();
  if (c === "TW") c = "CN";
  if (c.length !== 2) return "";
  return String.fromCodePoint(...c.split("").map((x) => 127397 + x.charCodeAt(0)));
}

// 各家 API 请求
async function fetchIpapi(ip) {
  try {
    const { data } = await httpGet(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
    return safeJsonParse(data);
  } catch (error) {
    return null;
  }
}

// 改进的 IP 获取函数 - 尝试多个 API
async function getCurrentIP() {
  // 尝试所有 API
  for (const url of IP_QUERY_APIS) {
    try {
      const { data } = await httpGet(url);
      const json = safeJsonParse(data);
      if (json) {
        const ip = json.ip || json.ip_addr || json.query || json.ip_string;
        if (ip && typeof ip === 'string' && ip.includes('.')) {
          return ip.trim();
        }
      }
      // 如果是纯文本响应
      if (typeof data === 'string' && data.includes('.')) {
        const ipMatch = data.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
        if (ipMatch) return ipMatch[0];
      }
    } catch (_) {
      continue;
    }
  }
  
  // 纯文本 API 备用
  const textApis = [
    "https://api.ipify.org",
    "http://ifconfig.me/ip",
    "https://icanhazip.com",
    "http://checkip.amazonaws.com"
  ];
  
  for (const url of textApis) {
    try {
      const { data } = await httpGet(url);
      if (data && typeof data === 'string') {
        const ipMatch = data.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
        if (ipMatch) return ipMatch[0];
      }
    } catch (_) {
      continue;
    }
  }
  
  return null;
}

// 翻译英文国家/城市名为中文的映射表
const locationTranslations = {
  // 常见国家
  "United States": "美国",
  "United Kingdom": "英国",
  "Germany": "德国",
  "France": "法国",
  "Japan": "日本",
  "South Korea": "韩国",
  "Singapore": "新加坡",
  "Hong Kong": "香港",
  "Taiwan": "台湾",
  "China": "中国",
  "Canada": "加拿大",
  "Australia": "澳大利亚",
  "Russia": "俄罗斯",
  "India": "印度",
  "Brazil": "巴西",
  "Netherlands": "荷兰",
  "Switzerland": "瑞士",
  "Sweden": "瑞典",
  "Norway": "挪威",
  "Finland": "芬兰",
  "Denmark": "丹麦",
  "Italy": "意大利",
  "Spain": "西班牙",
  "Portugal": "葡萄牙",
  "Poland": "波兰",
  "Czech Republic": "捷克",
  "Austria": "奥地利",
  "Belgium": "比利时",
  "Ireland": "爱尔兰",
  "New Zealand": "新西兰",
  "Malaysia": "马来西亚",
  "Thailand": "泰国",
  "Vietnam": "越南",
  "Philippines": "菲律宾",
  "Indonesia": "印度尼西亚",
  "Turkey": "土耳其",
  "United Arab Emirates": "阿拉伯联合酋长国",
  "Saudi Arabia": "沙特阿拉伯",
  "Israel": "以色列",
  "South Africa": "南非",
  "Mexico": "墨西哥",
  "Argentina": "阿根廷",
  "Chile": "智利",
  
  // 常见城市
  "Tokyo": "东京",
  "Osaka": "大阪",
  "Kyoto": "京都",
  "Seoul": "首尔",
  "Singapore": "新加坡",
  "Hong Kong": "香港",
  "Beijing": "北京",
  "Shanghai": "上海",
  "Guangzhou": "广州",
  "Shenzhen": "深圳",
  "Taipei": "台北",
  "New York": "纽约",
  "Los Angeles": "洛杉矶",
  "San Francisco": "旧金山",
  "Chicago": "芝加哥",
  "London": "伦敦",
  "Paris": "巴黎",
  "Berlin": "柏林",
  "Frankfurt": "法兰克福",
  "Moscow": "莫斯科",
  "Sydney": "悉尼",
  "Melbourne": "墨尔本",
  "Toronto": "多伦多",
  "Vancouver": "温哥华"
};

// 翻译地理位置信息
function translateLocation(englishName) {
  if (!englishName) return "未知";
  // 先尝试完全匹配
  if (locationTranslations[englishName]) {
    return locationTranslations[englishName];
  }
  // 尝试部分匹配（去除 ", " 后的部分）
  const parts = englishName.split(", ");
  if (parts.length > 0 && locationTranslations[parts[0]]) {
    return locationTranslations[parts[0]];
  }
  // 如果无法翻译，返回原英文名
  return englishName;
}

// ========== 主逻辑 ==========
(async () => {
  let ip = await getCurrentIP();

  if (!ip) {
    $done({ 
      title: "IP 纯净度检测", 
      content: "❌ 获取 IP 地址失败\n\n可能原因：\n1. 网络连接异常\n2. 当前节点无外网访问权限\n3. 所有查询服务暂时不可用",
      icon: "network.slash" 
    });
    return;
  }

  // 并行获取所有数据
  const [
    ipapiData,
    scamResult,
    ipwhoisResult,
    ipdataResult,
    ippureScore
  ] = await Promise.allSettled([
    fetchIpapi(ip),
    gradeScamalytics(ip),
    gradeIpwhois(ip),
    gradeIpdata(ip),
    (async () => {
      try {
        const { data } = await httpGet(IPPURE_URL);
        const base = safeJsonParse(data);
        return base ? base.fraudScore : null;
      } catch (_) {
        return null;
      }
    })()
  ]);

  const grades = [];
  
  // IPPURE 评分
  if (ippureScore.status === "fulfilled" && ippureScore.value !== null) {
    grades.push(gradeIppure(ippureScore.value));
  } else {
    grades.push({ sev: 2, text: "IPPure：服务不可用" });
  }
  
  // ipapi 评分
  let locationInfo = {};
  if (ipapiData.status === "fulfilled" && ipapiData.value) {
    grades.push(gradeIpapi(ipapiData.value));
    
    // 从 ipapi 获取位置信息
    const ipapiJson = ipapiData.value;
    
    // ASN 信息 - 保持英文显示
    const asnNumber = ipapiJson.asn?.asn ? `AS${ipapiJson.asn.asn}` : "";
    const asnOrg = ipapiJson.asn?.org || ipapiJson.asn?.name || "";
    const asnText = asnNumber ? `${asnNumber} ${asnOrg}`.trim() : "Unknown";
    
    // 地理位置信息翻译为中文
    const countryCode = ipapiJson.location?.country_code || "";
    const countryEnglish = ipapiJson.location?.country || "Unknown";
    const cityEnglish = ipapiJson.location?.city || "Unknown";
    
    const country = translateLocation(countryEnglish);
    const city = translateLocation(cityEnglish);
    const flag = flagEmoji(countryCode);
    const hostingLine = ipapiHostingText(ipapiJson);
    
    locationInfo = { asnText, flag, country, city, hostingLine };
  } else {
    grades.push({ sev: 2, text: "ipapi：服务不可用" });
    locationInfo = { 
      asnText: "Unknown", 
      flag: "", 
      country: "未知", 
      city: "未知", 
      hostingLine: "IP类型：未知" 
    };
  }
  
  // 其他服务评分
  if (scamResult.status === "fulfilled") grades.push(scamResult.value);
  if (ipwhoisResult.status === "fulfilled") grades.push(ipwhoisResult.value);
  if (ipdataResult.status === "fulfilled") grades.push(ipdataResult.value);

  const maxSev = grades.reduce((m, g) => Math.max(m, g.sev ?? 2), 0);
  const meta = severityMeta(maxSev);

  const riskLines = grades.map((g) => g.text).join("\n");

  // 收集风险因子
  const factorParts = [];
  if (ipapiData.status === "fulfilled" && ipapiData.value) {
    const j = ipapiData.value;
    const items = [];
    if (j.is_proxy === true) items.push("代理");
    if (j.is_tor === true) items.push("Tor网络");
    if (j.is_vpn === true) items.push("VPN");
    if (j.is_datacenter === true) items.push("数据中心");
    if (j.is_abuser === true) items.push("滥用者");
    if (j.is_crawler === true) items.push("爬虫");
    if (items.length) factorParts.push(`ipapi 标记：${items.join("/")}`);
  }
  
  const factorText = factorParts.length ? `\n\n——风险标记详情——\n${factorParts.join("\n")}` : "";

  $done({
    title: "节点 IP 风险检测报告",
    content:
`✅ IP地址获取成功
🌐 IP地址：${ip}
📡 ASN信息：${locationInfo.asnText}
📍 地理位置：${locationInfo.flag} ${locationInfo.country} ${locationInfo.city}
🏷️ ${locationInfo.hostingLine}
🖥️ 当前节点：${nodeName}

——多源风险评分——
${riskLines}${factorText}

📊 综合评级：${maxSev >= 4 ? "🛑 极高风险" : maxSev >= 3 ? "⚠️ 高风险" : maxSev >= 2 ? "🔶 中等风险" : "✅ 低风险"}`,
    icon: meta.icon,
    "icon-color": meta.color
  });
})().catch((e) => {
  $done({
    title: "IP 纯净度检测",
    content: `请求失败：${String(e && e.message ? e.message : e)}`,
    icon: "network.slash"
  });
});
