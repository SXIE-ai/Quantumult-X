/*********************************
 * Quantumult X - IP 纯净度检测
 * 全中文显示版本
 *********************************/

const IPPURE_URL = "https://my.ippure.com/v1/info";

// 多个 IP 查询接口（自动容错）
const IP_QUERY_APIS = [
  "https://api.ipify.org?format=json",
  "https://api64.ipify.org?format=json",
  "https://ipapi.co/json/",
  "https://api.myip.com",
  "https://api.ip.sb/json"
];

// Quantumult X 参数（argument=xxx）
const policyName = $argument || "当前策略";

// ===== Quantumult X Fetch =====
function httpGet(url, headers = {}) {
  return $task.fetch({
    url,
    method: "GET",
    headers
  }).then(resp => {
    if (!resp || !resp.body) {
      throw new Error("无响应数据");
    }
    return resp.body;
  });
}

// ===== 工具函数 =====
function safeJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function 提取IP(data) {
  if (!data) return null;
  const json = safeJSON(data);
  if (json) {
    return json.ip || json.ip_addr || json.query || json.ip_string || null;
  }
  const m = String(data).match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  return m ? m[0] : null;
}

// ===== 获取当前出口 IP =====
async function 获取IP() {
  for (const api of IP_QUERY_APIS) {
    try {
      const body = await httpGet(api);
      const ip = 提取IP(body);
      if (ip) return ip;
    } catch {}
  }
  return null;
}

// ===== 主逻辑 =====
(async () => {
  const ip = await 获取IP();

  if (!ip) {
    $done({
      title: "IP 纯净度检测",
      content:
`❌ 获取 IP 失败

可能原因：
1️⃣ 当前策略无法访问外网
2️⃣ IP 查询接口被拦截
3️⃣ 网络异常`,
      icon: "network.slash"
    });
    return;
  }

  let score = null;
  try {
    const body = await httpGet(IPPURE_URL);
    const json = safeJSON(body);
    score = json?.fraudScore ?? null;
  } catch {}

  let 风险等级 = "未知";
  let 图标 = "questionmark.circle";
  let 颜色 = "#8E8E93";

  if (typeof score === "number") {
    if (score >= 80) {
      风险等级 = "🛑 极高风险";
      图标 = "xmark.octagon.fill";
      颜色 = "#8E0000";
    } else if (score >= 70) {
      风险等级 = "⚠️ 高风险";
      图标 = "exclamationmark.triangle.fill";
      颜色 = "#FF3B30";
    } else if (score >= 40) {
      风险等级 = "🔶 中等风险";
      图标 = "exclamationmark.circle.fill";
      颜色 = "#FF9500";
    } else {
      风险等级 = "✅ 低风险";
      图标 = "checkmark.seal.fill";
      颜色 = "#34C759";
    }
  }

  $done({
    title: "节点 IP 风险检测报告",
    content:
`🌐 出口 IP：${ip}
🖥️ 使用策略：${policyName}

—— 风险评估结果 ——
IPPure 评分：${score ?? "获取失败"}
综合判断：${风险等级}

说明：
• 分数越高，越容易被识别为代理/VPN
• ≥70 分可能影响流媒体 / 注册 / 验证`,
    icon: 图标,
    "title-color": 颜色
  });

})().catch(e => {
  $done({
    title: "IP 纯净度检测",
    content: `脚本运行异常：\n${String(e)}`,
    icon: "xmark.octagon.fill"
  });
});
