/**
 * ============================================================
 *  🖥️  SERVER.JS - نقطة تشغيل البوت + HTTP Server
 *  👑  المطور: 𝑺𝒉𝒂𝒅𝒐𝒘 𝑪𝑶𝑫
 *  📞  للتواصل: 777565658
 *  📢  القناة: https://whatsapp.com/channel/0029Vb7dSkk0gcfGBQc3Qx0V
 * ============================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BOT_FILE = path.join(__dirname, 'bot.js');
const UPDATE_FLAG = path.join(__dirname, '.restart');

let botProcess = null;
let botStartTime = Date.now();

function startBot() {
    console.log('🚀 [SERVER] تشغيل البوت...');
    botStartTime = Date.now();

    botProcess = spawn('node', [BOT_FILE], {
        stdio: 'inherit',
        cwd: __dirname
    });

    botProcess.on('exit', (code) => {
        if (fs.existsSync(UPDATE_FLAG)) {
            fs.unlinkSync(UPDATE_FLAG);
            console.log('🔄 [SERVER] إعادة تشغيل بعد التحديث...');
            setTimeout(startBot, 2000);
        } else {
            console.log(`⚠️ [SERVER] توقف البوت بالكود ${code}، إعادة تشغيل بعد 5 ثوانٍ...`);
            setTimeout(startBot, 5000);
        }
    });

    botProcess.on('error', (err) => {
        console.log('❌ [SERVER] خطأ في البوت:', err.message);
        setTimeout(startBot, 5000);
    });
}

// مراقبة ملف .restart
setInterval(() => {
    if (fs.existsSync(UPDATE_FLAG) && botProcess) {
        console.log('🔄 [SERVER] استُلم إشارة تحديث...');
        botProcess.kill();
    }
}, 1000);

// ============================================================
//        🌐 HTTP Server (مطلوب لـ Render)
// ============================================================
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    const uptime = Math.floor((Date.now() - botStartTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const botAlive = botProcess && !botProcess.killed;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: botAlive ? 'online' : 'offline',
            uptime: `${hours}h ${minutes}m ${seconds}s`,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    res.end(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🛍️ بوت أميرهم</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
            color: #fff; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 500px; width: 100%;
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 40px 30px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .status {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 20px;
            background: ${botAlive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};
            color: ${botAlive ? '#22c55e' : '#ef4444'};
            border: 1px solid ${botAlive ? '#22c55e' : '#ef4444'};
        }
        .status::before {
            content: '●';
            margin-left: 8px;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        h1 { font-size: 28px; margin-bottom: 10px; color: #fff; }
        h2 { font-size: 18px; color: #22c55e; margin-bottom: 30px; font-weight: normal; }
        .info {
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: right;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .info-row:last-child { border-bottom: none; }
        .label { color: #94a3b8; }
        .value { color: #22c55e; font-weight: bold; }
        a {
            color: #0ea5e9;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
            padding: 12px 25px;
            border: 1px solid #0ea5e9;
            border-radius: 50px;
            transition: all 0.3s;
        }
        a:hover { background: #0ea5e9; color: #fff; }
        .footer {
            margin-top: 25px;
            color: #64748b;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status">${botAlive ? 'متصل' : 'غير متصل'}</div>
        <h1>🛍️ بوت أميرهم</h1>
        <h2>${botAlive ? '✅ البوت يعمل بنجاح' : '⚠️ البوت متوقف'}</h2>

        <div class="info">
            <div class="info-row">
                <span class="label">👑 المطور</span>
                <span class="value">𝑺𝒉𝒂𝒅𝒐𝒘 𝑪𝑶𝑫</span>
            </div>
            <div class="info-row">
                <span class="label">📞 للتواصل</span>
                <span class="value">${DEV_INFO?.contact || '777565658'}</span>
            </div>
            <div class="info-row">
                <span class="label">⏱️ مدة التشغيل</span>
                <span class="value">${hours}h ${minutes}m ${seconds}s</span>
            </div>
            <div class="info-row">
                <span class="label">🌐 المنفذ</span>
                <span class="value">${PORT}</span>
            </div>
        </div>

        <a href="https://whatsapp.com/channel/0029Vb7dSkk0gcfGBQc3Qx0V" target="_blank">
            📢 قناة واتساب
        </a>

        <div class="footer">
            © 2026 - Amirhom Bot | Powered by Render
        </div>
    </div>
</body>
</html>
    `);
});

server.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║  🌐 HTTP Server يعمل على المنفذ: ${PORT}       ║`);
    console.log(`║  🔗 الرابط: https://your-app.onrender.com      ║`);
    console.log(`╚════════════════════════════════════════════════╝\n`);
});

// بدء البوت
startBot();

// منع الإغلاق المفاجئ
process.on('SIGINT', () => {
    console.log('\n🛑 [SERVER] إيقاف...');
    if (botProcess) botProcess.kill();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.log('⚠️ [SERVER] خطأ غير متوقع:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.log('⚠️ [SERVER] رفض غير معالج:', err?.message || err);
});