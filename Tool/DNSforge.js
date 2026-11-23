const BASE = 'https://adguardhome.lv10.ren/api/v1';
const KEY_ACCESS = 'dnsforge_access_token';
const KEY_REFRESH = 'dnsforge_refresh_token';

const isQX = typeof $task !== 'undefined';

function log(msg) {
  console.log('[DNSForge] ' + msg);
}

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

function summarize(raw, maxLen = 300) {
  if (raw == null) return '';
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return s.length > maxLen ? s.slice(0, maxLen) + '...(truncated)' : s;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function http(method, path, body, token) {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const url = BASE + path;
    const payload = body ? JSON.stringify(body) : undefined;
    log(`请求开始: ${method} ${path} | hasToken=${Boolean(token)}`);

    if (isQX) {
      $task.fetch({
        url,
        method,
        headers,
        body: payload
      }).then(
        (resp) => {
          const status = resp.statusCode || 0;
          let json = null;
          try { json = JSON.parse(resp.body); } catch (e) {}
          log(`请求响应: ${method} ${path} -> HTTP ${status} | body=${summarize(resp.body)}`);
          resolve({ status, data: json, raw: resp.body });
        },
        (err) => {
          const errStr = String((err && (err.error || err.message)) || err || '网络异常');
          log(`请求失败: ${method} ${path} -> ${errStr}`);
          resolve({ status: 0, data: null, raw: '', err: errStr });
        }
      );
    } else {
      const options = { url, headers, body: payload };
      const cb = (err, resp, data) => {
        if (err) {
          const errStr = String(err);
          log(`请求失败: ${method} ${path} -> ${errStr}`);
          return resolve({ status: 0, data: null, raw: '', err: errStr });
        }
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        log(`请求响应: ${method} ${path} -> HTTP ${resp.status} | body=${summarize(data)}`);
        resolve({ status: resp.status, data: json, raw: data });
      };
      if (method === 'GET') $httpClient.get(options, cb);
      else $httpClient.post(options, cb);
    }
  });
}

function errText(r) {
  return (
    (r.data &&
      (r.data.message ||
        (r.data.error && (r.data.error.message || r.data.error.code)))) ||
    ''
  );
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

function isCheckedToday(data) {
  if (!data || typeof data !== 'object') return false;
  const d = data.data || data;
  const done =
    d.checked_today ??
    d.checked_in_today ??
    d.checkedIn ??
    d.today_checked_in ??
    d.is_checked_in ??
    d.checked;
  return done === true;
}

// ---------- 模式 1: http-response, 抓 token ----------
if (typeof $response !== 'undefined') {
  try {
    const rawBody = $response.body || '';
    log(`抓包触发 | status=${$response.status || $response.statusCode || 'unknown'} | bodyLen=${rawBody.length}`);
    const data = JSON.parse(rawBody);
    const tokens = extractTokens(data);
    if (tokens && tokens.access_token) {
      const firstTime = !readKey(KEY_ACCESS);
      writeKey(String(tokens.access_token), KEY_ACCESS);
      if (tokens.refresh_token) {
        writeKey(String(tokens.refresh_token), KEY_REFRESH);
      }
      log(`Token 写入成功 | firstTime=${firstTime} | hasRefresh=${Boolean(tokens.refresh_token)}`);
      notify('DNSForge', firstTime ? 'Token 已抓取, 每日签到已就绪' : 'Token 已更新');
    } else {
      log(`抓包未找到 access_token | body=${summarize(rawBody)}`);
      notify('DNSForge 抓包提示', '已命中接口但未找到 access_token，请检查响应结构');
    }
  } catch (e) {
    const msg = String((e && e.message) || e);
    log(`抓包解析异常: ${msg}`);
    notify('DNSForge 抓包异常', msg);
  }
  $done({});
} else {
  // ---------- 模式 2: cron, 每日签到 ----------
  (async () => {
    const fail = (body) => {
      log(`签到失败通知: ${body}`);
      notify('DNSForge 签到失败', body);
    };
    try {
      log('定时任务启动');
      let access = readKey(KEY_ACCESS);
      let refresh = readKey(KEY_REFRESH);
      log(`读取本地凭证 | hasAccess=${Boolean(access)} | hasRefresh=${Boolean(refresh)}`);

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
        log(`已更新本地凭证 | hasRefresh=${Boolean(refresh)}`);
      };

      const refreshTokens = async () => {
        if (!refresh) throw new Error('无 refresh_token');
        log('尝试刷新 token...');
        const r = await http('POST', '/auth/refresh', { refresh_token: refresh });
        if (r.status !== 200 || !r.data) {
          throw new Error('刷新 token 失败: HTTP ' + r.status + ' ' + summarize(r.raw, 150));
        }
        const nextTokens = extractTokens(r.data);
        if (!nextTokens || !nextTokens.access_token) {
          throw new Error('刷新响应无 access_token: ' + summarize(r.raw, 150));
        }
        saveTokens(nextTokens);
      };

      const withAuth = async (fn) => {
        let r = await fn(access);
        if (r.status === 401) {
          log('收到 HTTP 401，准备刷新 token 后重试');
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
        log(`查询签到状态异常: ${String((e && e.message) || e)}`);
        fail('登录已过期, 请打开 DNSForge 网页登录一次');
        return $done();
      }
      if (st.status === 200 && st.data) {
        const done = isCheckedToday(st.data);
        log(`签到状态查询结果 | done=${done}`);
        if (done) {
          const d = st.data.data || st.data;
          const daysInfo = d.member_days != null ? `，会员剩余 ${d.member_days} 天` : '';
          notify('DNSForge 签到', `今日已签到, 无需重复签到${daysInfo}`);
          return $done();
        }
      }

      // 2. 签到
      let r;
      try {
        r = await withAuth((t) => http('POST', '/me/checkin', {}, t));
      } catch (e) {
        log(`执行签到请求异常: ${String((e && e.message) || e)}`);
        fail('登录已过期, 请打开 DNSForge 网页登录一次');
        return $done();
      }

      // 若请求超时（status === 0），稍等后复查一次是否已实际入账
      if (r.status === 0) {
        log('签到请求超时(HTTP 0)，等待 2 秒后复查签到状态...');
        await sleep(2000);
        const checkAfter = await withAuth((t) => http('GET', '/me/checkin', null, t));
        if (checkAfter.status === 200 && checkAfter.data && isCheckedToday(checkAfter.data)) {
          const d = checkAfter.data.data || checkAfter.data;
          const left = d.member_days;
          log(`复查确认已签到 | left=${left}`);
          notify(
            'DNSForge 签到成功',
            left != null ? `响应超时但已到账，会员剩余 ${left} 天` : '响应超时但已到账'
          );
          return $done();
        }
      }

      const msg = errText(r);
      if (r.status === 200 || r.status === 201) {
        const d = (r.data && r.data.data) || r.data || {};
        const left =
          d.member_days ??
          d.membership_days_left ??
          d.days_left ??
          d.remaining_days ??
          d.expire_in_days;
        log(`签到成功 | left=${left} | msg=${msg}`);
        notify(
          'DNSForge 签到成功',
          left != null ? '会员剩余 ' + left + ' 天' : msg || '签到成功, 会员 +1 天'
        );
      } else if (
        r.status === 409 ||
        msg.includes('已签到') ||
        msg.toLowerCase().includes('already')
      ) {
        log(`接口提示今日已签到: ${msg}`);
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
