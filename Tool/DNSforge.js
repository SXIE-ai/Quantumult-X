const BASE = 'https://adguardhome.lv10.ren/api/v1';
const KEY_ACCESS = 'dnsforge_access_token';
const KEY_REFRESH = 'dnsforge_refresh_token';

const isQX = typeof $task !== 'undefined';

function notify(title, body) {
  if (isQX) {
    $notify(title, '', body);
  } else if (typeof $notification !== 'undefined') {
    $notification.post(title, '', body);
  }
}

function readKey(k) {
  if (isQX && typeof $prefs !== 'undefined') return $prefs.valueForKey(k);
  if (typeof $persistentStore !== 'undefined') return $persistentStore.read(k);
  return null;
}

function writeKey(v, k) {
  if (isQX && typeof $prefs !== 'undefined') return $prefs.setValueForKey(v, k);
  if (typeof $persistentStore !== 'undefined') return $persistentStore.write(v, k);
}

function http(method, path, body, token) {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const url = BASE + path;
    const payload = body ? JSON.stringify(body) : undefined;

    if (isQX) {
      $task.fetch({
        url,
        method,
        headers,
        body: payload
      }).then(
        (resp) => {
          let json = null;
          try { json = JSON.parse(resp.body); } catch (e) {}
          resolve({ status: resp.statusCode || 0, data: json, raw: resp.body });
        },
        () => resolve({ status: 0, data: null, raw: '' })
      );
    } else {
      const options = { url, headers, body: payload };
      const cb = (err, resp, data) => {
        if (err) return resolve({ status: 0, data: null, raw: '' });
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ status: resp.status, data: json, raw: data });
      };
      if (method === 'GET') $httpClient.get(options, cb);
      else $httpClient.post(options, cb);
    }
  });
}

function errText(r) {
  return (r.data && (r.data.message || (r.data.error && r.data.error.message))) || '';
}

function extractTokens(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = [
    obj.tokens,
    obj.data && obj.data.tokens,
    obj.data,
    obj
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object' && c.access_token) {
      return c;
    }
  }
  return null;
}

// ---------- 模式 1: http-response, 抓 token ----------
if (typeof $response !== 'undefined') {
  try {
    const rawBody = $response.body || '';
    const data = JSON.parse(rawBody);
    const tokens = extractTokens(data);
    if (tokens && tokens.access_token) {
      const firstTime = !readKey(KEY_ACCESS);
      writeKey(String(tokens.access_token), KEY_ACCESS);
      if (tokens.refresh_token) {
        writeKey(String(tokens.refresh_token), KEY_REFRESH);
      }
      notify('DNSForge', firstTime ? 'Token 已抓取, 每日签到已就绪' : 'Token 已更新');
    } else {
      notify('DNSForge 抓包提示', '已命中接口但未找到 access_token，请检查响应结构');
    }
  } catch (e) {
    notify('DNSForge 抓包异常', String((e && e.message) || e));
  }
  $done({});
} else {
  // ---------- 模式 2: cron, 每日签到 ----------
  (async () => {
    const fail = (body) => notify('DNSForge 签到失败', body);
    try {
      let access = readKey(KEY_ACCESS);
      let refresh = readKey(KEY_REFRESH);
      if (!access) {
        fail('未抓取到 token, 请打开 DNSForge 网页登录一次');
        return $done();
      }

      const saveTokens = (t) => {
        if (!t) return;
        if (t.access_token) {
          access = String(t.access_token);
          writeKey(access, KEY_ACCESS);
        }
        if (t.refresh_token) {
          refresh = String(t.refresh_token);
          writeKey(refresh, KEY_REFRESH);
        }
      };

      const refreshTokens = async () => {
        if (!refresh) throw new Error('无 refresh_token');
        const r = await http('POST', '/auth/refresh', { refresh_token: refresh });
        if (r.status !== 200 || !r.data) throw new Error('刷新 token 失败: HTTP ' + r.status);
        const nextTokens = extractTokens(r.data);
        if (!nextTokens || !nextTokens.access_token) throw new Error('刷新响应无 access_token');
        saveTokens(nextTokens);
      };

      const withAuth = async (fn) => {
        let r = await fn(access);
        if (r.status === 401) {
          await refreshTokens();
          r = await fn(access);
        }
        return r;
      };

      // 1. 先查今天是否已签到
      let st;
      try {
        st = await withAuth((t) => http('GET', '/me/checkin', null, t));
      } catch (e) {
        fail('登录已过期, 请打开 DNSForge 网页登录一次');
        return $done();
      }
      if (st.status === 200 && st.data) {
        const d = st.data.data || st.data;
        const done = d.checked_in_today ?? d.checkedIn ?? d.today_checked_in ?? d.is_checked_in ?? d.checked;
        if (done === true) {
          notify('DNSForge 签到', '今日已签到, 无需重复签到');
          return $done();
        }
      }

      // 2. 签到
      let r;
      try {
        r = await withAuth((t) => http('POST', '/me/checkin', {}, t));
      } catch (e) {
        fail('登录已过期, 请打开 DNSForge 网页登录一次');
        return $done();
      }
      const msg = errText(r);
      if (r.status === 200) {
        const d = (r.data && r.data.data) || r.data || {};
        const left = d.membership_days_left ?? d.days_left ?? d.remaining_days ?? d.expire_in_days;
        notify('DNSForge 签到成功', left != null ? '会员剩余 ' + left + ' 天' : (msg || '签到成功, 会员 +1 天'));
      } else if (msg.includes('已签到') || msg.toLowerCase().includes('already')) {
        notify('DNSForge 签到', '今日已签到');
      } else {
        throw new Error('签到失败: HTTP ' + r.status + (msg ? ' ' + msg : ''));
      }
    } catch (e) {
      fail(String((e && e.message) || e));
    }
    $done();
  })();
}
