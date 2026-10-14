/**
 * ============================================================
 *  🖥️  SERVER.JS - نقطة تشغيل البوت
 *  👑  المطور: 𝑺𝒉𝒂𝒅𝒐𝒘 𝑪𝑶𝑫
 *  📞  للتواصل: 777565658
 *  📢  القناة: https://whatsapp.com/channel/0029Vb7dSkk0gcfGBQc3Qx0V
 * ============================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOT_FILE = path.join(__dirname, 'bot.js');
const UPDATE_FLAG = path.join(__dirname, '.restart');

let botProcess = null;

function startBot() {
    console.log('🚀 [SERVER] تشغيل البوت...');

    botProcess = spawn('node', [BOT_FILE], {
        stdio: 'inherit',
        cwd: __dirname
    });

    botProcess.on('exit', (code) => {
        // إذا كان الخروج بسبب تحديث -> إعادة تشغيل فورية
        if (fs.existsSync(UPDATE_FLAG)) {
            fs.unlinkSync(UPDATE_FLAG);
            console.log('🔄 [SERVER] إعادة تشغيل بعد التحديث...');
            setTimeout(startBot, 2000);
        } else {
            console.log(`⚠️ [SERVER] توقف البوت بالكود ${code}، إعادة تشغيل بعد 5 ثوانٍ...`);
            setTimeout(startBot, 5000);
        }
    });
}

// مراقبة ملف .restart لإعادة التشغيل عند التحديث
setInterval(() => {
    if (fs.existsSync(UPDATE_FLAG) && botProcess) {
        console.log('🔄 [SERVER] استُلم إشارة تحديث، إعادة تشغيل البوت...');
        botProcess.kill();
    }
}, 1000);

// بدء التشغيل
startBot();

// منع الإغلاق المفاجئ
process.on('SIGINT', () => {
    console.log('\n🛑 [SERVER] إيقاف البوت...');
    if (botProcess) botProcess.kill();
    process.exit(0);
});