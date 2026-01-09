// Quantumult X event-interaction 脚本 - IP纯净度检测
// 使用方法：在脚本列表点击运行

(async () => {
    try {
        // event-interaction 脚本开头显示加载中
        $notify("🔄 IP检测中", "正在查询IP信息...", "", {});
        
        // 方法1: 直接使用 $httpClient (event-interaction 支持)
        const getIPViaHttpClient = () => {
            return new Promise((resolve, reject) => {
                $httpClient.get('https://api.ipify.org?format=json', function(error, response, data) {
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            const json = JSON.parse(data);
                            resolve(json.ip);
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            });
        };
        
        // 方法2: 使用 $task.fetch 作为备选
        const getIPViaTask = async () => {
            const response = await $task.fetch({
                url: 'https://api.ipify.org?format=json'
            });
            if (response.statusCode === 200) {
                const data = JSON.parse(response.body);
                return data.ip;
            }
            throw new Error('HTTP ' + response.statusCode);
        };
        
        let ip = null;
        
        // 尝试两种方法获取IP
        try {
            ip = await getIPViaHttpClient();
        } catch (e) {
            console.log('$httpClient 失败，尝试 $task.fetch');
            try {
                ip = await getIPViaTask();
            } catch (e2) {
                throw new Error('两种方法都失败: ' + e2.message);
            }
        }
        
        if (!ip) {
            $notify("❌ 获取失败", "无法获取IP地址", "请检查网络连接", {});
            return;
        }
        
        // 获取IP详细信息
        let locationInfo = '';
        let ispInfo = '';
        let riskInfo = '✅ 低风险';
        
        try {
            // 使用 ip-api.com 获取详细信息
            $httpClient.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, function(error, response, data) {
                if (!error && response.status === 200) {
                    try {
                        const info = JSON.parse(data);
                        if (info.status === 'success') {
                            locationInfo = `${info.country} ${info.city}`;
                            ispInfo = info.isp;
                            
                            // 简单风险判断
                            if (info.hosting === true || info.proxy === true) {
                                riskInfo = '⚠️ 数据中心/代理';
                            }
                            
                            // 显示完整结果
                            showResult(ip, locationInfo, ispInfo, riskInfo, info);
                        }
                    } catch (e) {
                        showSimpleResult(ip);
                    }
                } else {
                    showSimpleResult(ip);
                }
            });
            
        } catch (e) {
            showSimpleResult(ip);
        }
        
        function showSimpleResult(ip) {
            const content = `🌐 IP地址: ${ip}\n\n无法获取详细信息\n可能原因:\n1. 网络限制\n2. API服务繁忙\n3. 节点无法访问外网`;
            
            $notify("🌐 IP检测完成", `IP: ${ip}`, content, {
                "icon": "globe",
                "media-url": "https://img.icons8.com/color/96/000000/ip-address.png"
            });
        }
        
        function showResult(ip, location, isp, risk, detailedInfo) {
            let content = `🌐 IP地址: ${ip}\n`;
            content += `📍 地理位置: ${location}\n`;
            content += `🏢 网络运营商: ${isp}\n`;
            content += `🔒 风险等级: ${risk}\n`;
            
            if (detailedInfo) {
                content += `\n📊 详细信息:\n`;
                content += `• 国家代码: ${detailedInfo.countryCode}\n`;
                content += `• 区域: ${detailedInfo.regionName}\n`;
                content += `• 时区: ${detailedInfo.timezone}\n`;
                
                if (detailedInfo.as) {
                    content += `• ASN: ${detailedInfo.as}\n`;
                }
                
                if (detailedInfo.mobile === true) {
                    content += `• 📱 移动网络\n`;
                }
                if (detailedInfo.proxy === true) {
                    content += `• 🔄 代理服务器\n`;
                }
                if (detailedInfo.hosting === true) {
                    content += `• 🖥️ 数据中心\n`;
                }
            }
            
            content += `\n⏰ 检测时间: ${new Date().toLocaleString('zh-CN')}`;
            
            // 根据风险等级选择图标
            let icon = "checkmark.shield.fill";
            let iconColor = "#34C759";
            
            if (risk.includes('⚠️')) {
                icon = "exclamationmark.shield.fill";
                iconColor = "#FF9500";
            }
            
            $notify("🛡️ IP纯净度检测", `IP: ${ip}`, content, {
                "icon": icon,
                "icon-color": iconColor,
                "media-url": "https://img.icons8.com/color/96/000000/security-checked.png"
            });
        }
        
    } catch (error) {
        $notify("❌ 脚本执行失败", "错误信息", error.message || "未知错误", {
            "icon": "xmark.circle.fill",
            "icon-color": "#FF3B30"
        });
    }
})();
