sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
        console.log(`\n🚀 البوت يعمل!\n👑 المطور: ${DEV_INFO.name}\n📞 للتواصل: ${DEV_INFO.contact}\n📢 القناة: ${DEV_INFO.channel}\n`);
    }

    if (connection === "close") {
        let shouldReconnect = true;
        let statusCode = null;

        try {
            statusCode = lastDisconnect?.error?.output?.statusCode;
        } catch (e) {}

        // 401 = logged out (تم تسجيل الخروج من الجهاز)
        if (statusCode === 401 || statusCode === 403) {
            shouldReconnect = false;
            console.log('🚫 تم تسجيل الخروج من الجهاز. يجب إعادة الربط بكود جديد.');
        } else {
            console.log(`🔄 انقطع الاتصال (كود ${statusCode || 'غير معروف'})، جاري إعادة التشغيل...`);
        }

        if (shouldReconnect) {
            setTimeout(() => startBot(), 5000);
        }
    }
});