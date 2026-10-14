/**
 * ============================================================
 *  🛍️  BOT.JS - بوت المتجر الإلكتروني + الحماية + التحديث الذاتي
 *  👑  المطور: 𝑺𝒉𝒂𝒅𝒐𝒘 𝑪𝑶𝑫
 *  📞  للتواصل: 777565658
 *  📢  القناة: https://whatsapp.com/channel/0029Vb7dSkk0gcfGBQc3Qx0V
 * ============================================================
 */

const { execSync } = require('child_process');

// التثبيت الذاتي
try {
    require.resolve("@whiskeysockets/baileys");
} catch (e) {
    console.log("📦 جاري تثبيت المكتبات...");
    execSync('npm install @whiskeysockets/baileys pino fs-extra @hapi/boom', { stdio: 'inherit' });
}

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    disconnectReason
} = require("@whiskeysockets/baileys");
const { Boom } = require('@hapi/boom');
const fs = require('fs-extra');
const path = require('path');
const pino = require("pino");

// ================= [ الإعدادات ] =================
const myPhoneNumber = "967782819819";
const ALLOWED_GROUP_LINK = "https://whatsapp.com/channel/0029Vb7dSkk0gcfGBQc3Qx0V";
const OWNER_NUMBER = "967782819819";
const UPDATE_PASSWORD = "777624567";

const DEV_INFO = {
    name: "𝑺𝒉𝒂𝒅𝒐𝒘 𝑪𝑶𝑫",
    contact: "777565658",
    channel: "https://whatsapp.com/channel/0029Vb7dSkk0gcfGBQc3Qx0V"
};

const BOT_FILE = path.join(__dirname, 'bot.js');
const RESTART_FLAG = path.join(__dirname, '.restart');
const BACKUP_DIR = path.join(__dirname, 'backups');
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const SESSION_ENV = process.env.SESSION_DATA;
// =================================================

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ================= [ قاعدة البيانات ] =================
const DB_FILE = './database.json';
const STORE_FILE = './store.json';

let db = { users: {}, orders: {}, coupons: {}, stats: { totalSales: 0, totalOrders: 0 } };
let store = {
    name: "متجر أميرهم",
    currency: "ر.س",
    shipping: { "صنعاء": 15, "عدن": 20, "تعز": 18, "الحديدة": 22, "حضرموت": 30 },
    products: [
        { id: "P001", name: "هاتف ذكي", price: 1500, stock: 10, category: "إلكترونيات", desc: "هاتف بمواصفات عالية" },
        { id: "P002", name: "سماعات لاسلكية", price: 250, stock: 25, category: "إلكترونيات", desc: "سماعات بلوتوث" },
        { id: "P003", name: "شاحن سريع", price: 80, stock: 50, category: "إكسسوارات", desc: "شاحن 65W" }
    ],
    paymentMethods: ["💵 الدفع عند الاستلام", "📱 تحويل بنكي", "💳 بطاقة ائتمانية"],
    faq: {
        "متى يوصل الطلب": "⏱️ خلال 2-5 أيام عمل.",
        "هل يوجد ضمان": "✅ نعم، ضمان رسمي.",
        "هل يوجد توصيل مجاني": "🎁 مجاني فوق 500 ر.س."
    }
};

if (fs.existsSync(DB_FILE)) db = fs.readJsonSync(DB_FILE);
else fs.writeJsonSync(DB_FILE, db);
if (fs.existsSync(STORE_FILE)) store = fs.readJsonSync(STORE_FILE);
else fs.writeJsonSync(STORE_FILE, store);

const saveDB = () => fs.writeJsonSync(DB_FILE, db);
const saveStore = () => fs.writeJsonSync(STORE_FILE, store);

const userSessions = new Map();
const updateStates = new Map();
const adminActionCache = new Map();

function getSession(user) {
    if (!userSessions.has(user)) {
        userSessions.set(user, { cart: [], state: null, tempData: {}, lastOrder: null });
    }
    return userSessions.get(user);
}

const RANKS = [
    { min: 0, title: "عضو مستجد 🌱" },
    { min: 50, title: "متفاعل برونزي 🥉" },
    { min: 150, title: "متفاعل فضي 🥈" },
    { min: 400, title: "متفاعل ذهبي ✨" },
    { min: 800, title: "صقر المجموعة 🦅" },
    { min: 1500, title: "مشرف فخري ⭐" },
    { min: 3000, title: "أمير المتفاعلين 👑" }
];
function getRank(p) { let t = RANKS[0].title; for (let r of RANKS) if (p >= r.min) t = r.title; return t; }
function isOwner(n) { return n && n.split('@')[0].includes(OWNER_NUMBER.replace(/\D/g, '')); }
function generateOrderId() { return "ORD" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10); }
function formatProductList(ps) { return ps.map(p => `🔹 *${p.name}*\n   🆔 ${p.id}\n   💰 ${p.price} ${store.currency}\n   📦 ${p.stock}\n   📝 ${p.desc}`).join('\n\n'); }
function getCartTotal(c) { return c.reduce((s, i) => s + (i.price * i.qty), 0); }

// ============================================================
//        🔐 استرجاع الجلسة من متغير البيئة (لـ Render)
// ============================================================
function restoreSession() {
    if (!SESSION_ENV) return;
    try {
        if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
        const credsJson = Buffer.from(SESSION_ENV, 'base64').toString('utf8');
        JSON.parse(credsJson); // تحقق أنه JSON صالح
        fs.writeFileSync(path.join(AUTH_DIR, 'creds.json'), credsJson);
        console.log('✅ تم استرجاع الجلسة من SESSION_DATA');
    } catch (e) {
        console.log('⚠️ فشل استرجاع الجلسة:', e.message);
    }
}

// ============================================================
//        🔄 نظام التحديث الذاتي
// ============================================================
async function handleUpdateCommand(sock, remoteJid, sender, msg, body) {
    if (body === 'تحديث الكود' || body === 'تحديث كود' || body === 'تحديث') {
        updateStates.set(sender, { step: 'awaiting_code' });
        await sock.sendMessage(remoteJid, {
            text: `🔄 *نظام تحديث الكود الذاتي*\n\n📥 أرسل *كود البوت الجديد كاملاً* الآن.\n\n⚠️ سيُطلب منك كلمة السر بعد الاستلام.`
        }, { quoted: msg });
        return true;
    }

    const state = updateStates.get(sender);
    if (!state) return false;

    if (state.step === 'awaiting_password') {
        if (body !== UPDATE_PASSWORD) {
            await sock.sendMessage(remoteJid, { text: `❌ *كلمة السر غير صحيحة!*\nأُلغي التحديث.` });
            updateStates.delete(sender);
            return true;
        }

        await sock.sendMessage(remoteJid, { text: `✅ كلمة السر صحيحة.\n⏳ جاري تطبيق التحديث...` });

        try {
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(BACKUP_DIR, `bot-${ts}.js`);
            fs.copySync(BOT_FILE, backupPath);
            fs.writeFileSync(BOT_FILE, state.newCode, 'utf8');

            const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('bot-')).sort();
            if (backups.length > 10) {
                backups.slice(0, backups.length - 10).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
            }

            await sock.sendMessage(remoteJid, {
                text: `✅ *تم استبدال الكود بنجاح!*\n\n📁 نسخة احتياطية: \`${path.basename(backupPath)}\`\n🔄 إعادة تشغيل البوت الآن...\n\n⏱️ انتظر 10 ثوانٍ ثم أرسل "المتجر".`
            });

            updateStates.delete(sender);

            // إنشاء ملف إشارة إعادة التشغيل للسيرفر
            fs.writeFileSync(RESTART_FLAG, Date.now().toString());

            setTimeout(() => process.exit(0), 3000);

        } catch (err) {
            await sock.sendMessage(remoteJid, { text: `❌ فشل التحديث: ${err.message}` });
            updateStates.delete(sender);
        }
        return true;
    }

    if (state.step === 'awaiting_code') {
        if (body.length < 100) {
            await sock.sendMessage(remoteJid, { text: `❌ الكود قصير جداً، أرسله كاملاً.` });
            return true;
        }
        updateStates.set(sender, { step: 'awaiting_password', newCode: body });
        await sock.sendMessage(remoteJid, {
            text: `🔐 *تم استلام الكود!*\n\n📏 الحجم: ${body.length} حرف\n\nأرسل *كلمة السر* لتأكيد التحديث:`
        }, { quoted: msg });
        return true;
    }

    return false;
}

// ============================================================
//                    تشغيل البوت
// ============================================================
async function startBot() {
    // استرجاع الجلسة إن وُجدت في Render
    restoreSession();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        version,
        browser: ["Amirhom Bot", "Chrome", "1.0.0"]
    });

    // كود الربط
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(myPhoneNumber);
                console.log("\x1b[32m%s\x1b[0m", `\n╔════════════════════════════════════════╗`);
                console.log("\x1b[32m%s\x1b[0m", `║  ✅ كود الربط: [ ${code} ]  ║`);
                console.log("\x1b[32m%s\x1b[0m", `╚════════════════════════════════════════╝\n`);
            } catch (err) { console.log("خطأ:", err.message); }
        }, 6000);
    }

    // حفظ الجلسة + طباعتها كـ Base64 لـ Render
    sock.ev.on("creds.update", async () => {
        await saveCreds();
        try {
            const credsPath = path.join(AUTH_DIR, 'creds.json');
            if (fs.existsSync(credsPath)) {
                const b64 = fs.readFileSync(credsPath).toString('base64');
                console.log('\n========== SESSION_DATA (انسخ هذا إلى Render) ==========');
                console.log(b64);
                console.log('========================================================\n');
            }
        } catch (e) {}
    });

    // ========== ترحيب ومغادرة ==========
    sock.ev.on("group-participants.update", async (update) => {
        const { id, participants, action, author } = update;
        try {
            const cacheKey = `${id}-${participants[0]}-${action}`;

            if (action === "promote" && author) {
                const md = await sock.groupMetadata(id);
                const owner = md.owner === author || isOwner(author);
                if (!owner) {
                    if (adminActionCache.has(cacheKey)) return;
                    adminActionCache.set(cacheKey, true);
                    setTimeout(() => adminActionCache.delete(cacheKey), 4000);
                    setTimeout(() => sock.groupParticipantsUpdate(id, participants, "demote").catch(() => {}), 500);
                    return;
                }
            }

            if (action === "add") {
                for (const num of participants) {
                    if (num.includes(myPhoneNumber)) continue;
                    await sock.sendMessage(id, {
                        text: `✨ أهلاً @${num.split('@')[0]} في *${store.name}*! 🛍️\n\nأرسل "المتجر" لعرض المنتجات.`,
                        mentions: [num]
                    });
                }
            } else if (action === "remove") {
                for (const num of participants) {
                    if (num.includes(myPhoneNumber)) continue;
                    await sock.sendMessage(id, { text: `🚪 غادرنا @${num.split('@')[0]}.. بالتوفيق ✨`, mentions: [num] });
                }
            }
        } catch (e) { console.log("خطأ:", e.message); }
    });

    // ========== معالجة الرسائل ==========
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const sender = msg.key.participant || remoteJid;
        const isGroup = remoteJid.endsWith('@g.us');
        const owner = isOwner(sender);

        const type = Object.keys(msg.message)[0];
        let body = (type === 'conversation') ? msg.message.conversation :
                   (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text :
                   (type === 'imageMessage') ? msg.message.imageMessage.caption : '';
        body = (body || '').trim();

        const session = getSession(sender);

        // 🔄 أوامر التحديث (للمالك فقط)
        if (owner) {
            const handled = await handleUpdateCommand(sock, remoteJid, sender, msg, body);
            if (handled) return;
        }

        if (!db.users[sender]) {
            db.users[sender] = { points: 0, messages: 0, linkWarns: 0, audioWarns: 0, isWaitingReminder: false };
        }

        const skipKeywords = ['تذكير','حسابي','تفاعلي','نقاطي','مطور','بوت','المتجر','منتجات','سلة','طلبي','تحديث الكود','تحديث'];
        if (body && !skipKeywords.includes(body) && !body.startsWith('الحسابة') && !body.startsWith('بحث')) {
            db.users[sender].messages += 1;
            db.users[sender].points += 2;
            saveDB();
        }

        const isAudioViolation = type === 'audioMessage' || JSON.stringify(msg.message).includes('"audioMessage"');

        // ========== الحماية في المجموعات ==========
        if (isGroup) {
            let groupOwner = false;
            try {
                const md = await sock.groupMetadata(remoteJid);
                groupOwner = md.owner === sender || owner;
            } catch (e) {}

            if (!groupOwner) {
                const urlRegex = /https?:\/\/[^\s]+/gi;
                if (urlRegex.test(body) && !body.includes(ALLOWED_GROUP_LINK)) {
                    try {
                        await sock.sendMessage(remoteJid, { delete: msg.key });
                        db.users[sender].linkWarns += 1;
                        saveDB();
                        if (db.users[sender].linkWarns >= 3) {
                            await sock.sendMessage(remoteJid, { text: `🚫 طرد @${sender.split('@')[0]} (3/3).`, mentions: [sender] });
                            await sock.groupParticipantsUpdate(remoteJid, [sender], "remove");
                            db.users[sender].linkWarns = 0;
                            saveDB();
                        } else {
                            await sock.sendMessage(remoteJid, { text: `⚠️ الروابط ممنوعة!\n👤 @${sender.split('@')[0]}\n📥 (${db.users[sender].linkWarns}/3)`, mentions: [sender] });
                        }
                    } catch (e) {}
                    return;
                }

                if (isAudioViolation) {
                    try {
                        await sock.sendMessage(remoteJid, { delete: msg.key });
                        db.users[sender].audioWarns += 1;
                        saveDB();
                        if (db.users[sender].audioWarns >= 7) {
                            await sock.sendMessage(remoteJid, { text: `🚫 طرد @${sender.split('@')[0]} (7/7).`, mentions: [sender] });
                            await sock.groupParticipantsUpdate(remoteJid, [sender], "remove");
                            db.users[sender].audioWarns = 0;
                            saveDB();
                        } else {
                            await sock.sendMessage(remoteJid, { text: `⚠️ المقاطع الصوتية ممنوعة!\n👤 @${sender.split('@')[0]}\n📥 (${db.users[sender].audioWarns}/7)`, mentions: [sender] });
                        }
                    } catch (e) {}
                    return;
                }
            }
        }

        // ========== التذكير ==========
        if (db.users[sender].isWaitingReminder) {
            db.users[sender].isWaitingReminder = false;
            saveDB();
            await sock.sendMessage(remoteJid, { text: `⏰ سأذكّرك كل 30 دقيقة لمدة ساعتين.` }, { quoted: msg });
            let count = 0;
            const interval = setInterval(async () => {
                count++;
                await sock.sendMessage(remoteJid, { text: `🔔 *تذكير:* "${body}"` });
                if (count >= 4) {
                    clearInterval(interval);
                    await sock.sendMessage(remoteJid, { text: `✅ انتهت فترة التذكير.` });
                }
            }, 30 * 60 * 1000);
            return;
        }

        // ========== حالات المستخدم ==========
        if (session.state) {
            const st = session.state;

            if (st === 'waiting_address') {
                session.tempData.address = body;
                session.state = 'waiting_city';
                await sock.sendMessage(remoteJid, { text: `🏙️ أرسل *المدينة*:\n${Object.keys(store.shipping).join(' | ')}` });
                return;
            }

            if (st === 'waiting_city') {
                const city = Object.keys(store.shipping).find(c => body.includes(c));
                if (!city) { await sock.sendMessage(remoteJid, { text: `❌ المدينة غير مدعومة.` }); return; }
                session.tempData.city = city;
                session.tempData.shippingCost = store.shipping[city];
                session.state = 'waiting_payment';
                await sock.sendMessage(remoteJid, {
                    text: `💳 اختر طريقة الدفع:\n${store.paymentMethods.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
                });
                return;
            }

            if (st === 'waiting_payment') {
                const idx = parseInt(body) - 1;
                if (isNaN(idx) || !store.paymentMethods[idx]) { await sock.sendMessage(remoteJid, { text: `❌ اختر رقماً صحيحاً.` }); return; }
                session.tempData.payment = store.paymentMethods[idx];
                session.state = null;

                const orderId = generateOrderId();
                const subtotal = getCartTotal(session.cart);
                const total = subtotal + session.tempData.shippingCost;

                db.orders[orderId] = {
                    id: orderId,
                    customer: sender.split('@')[0],
                    items: session.cart,
                    address: session.tempData.address,
                    city: session.tempData.city,
                    shipping: session.tempData.shippingCost,
                    payment: session.tempData.payment,
                    total, subtotal,
                    status: "قيد المراجعة ⏳",
                    date: new Date().toISOString()
                };
                db.stats.totalOrders++;
                db.stats.totalSales += total;
                saveDB();

                for (const item of session.cart) {
                    const p = store.products.find(pr => pr.id === item.id);
                    if (p) p.stock -= item.qty;
                }
                saveStore();

                session.lastOrder = orderId;
                session.cart = [];
                session.tempData = {};

                await sock.sendMessage(remoteJid, {
                    text: `✅ *تم استلام طلبك!*\n\n🆔 ${orderId}\n💰 الإجمالي: *${total} ${store.currency}*\n💳 ${db.orders[orderId].payment}\n📍 ${db.orders[orderId].address}, ${db.orders[orderId].city}\n\n📞 سنتواصل معك قريباً.`
                });

                try {
                    await sock.sendMessage(OWNER_NUMBER + "@s.whatsapp.net", {
                        text: `🔔 *طلب جديد!*\n🆔 ${orderId}\n👤 ${sender.split('@')[0]}\n💰 ${total} ${store.currency}`
                    });
                } catch (e) {}
                return;
            }
        }

        // ========== الأوامر الأساسية ==========
        if (body === 'المتجر' || body === 'القائمة' || body === 'ابدأ') {
            await sock.sendMessage(remoteJid, {
                text: `🛍️ *أهلاً بك في ${store.name}*\n\n1️⃣ *منتجات* - عرض المنتجات\n2️⃣ *سلة* - سلتك\n3️⃣ *طلبي* - متابعة\n4️⃣ *بحث [اسم]*\n5️⃣ *طرق الدفع*\n6️⃣ *الشحن*\n7️⃣ *أسئلة*\n8️⃣ *تواصل*\n9️⃣ *حسابي*\n\n💡 اكتب الأمر مباشرة`
            }, { quoted: msg });
            return;
        }

        if (body === 'منتجات' || body === '1') {
            await sock.sendMessage(remoteJid, { text: `🛍️ *كتالوج ${store.name}*\n\n${formatProductList(store.products)}\n\n🛒 للإضافة: *أضف [الكود]*` }, { quoted: msg });
            return;
        }

        if (body.startsWith('بحث ') || body.startsWith('ابحث ')) {
            const q = body.replace(/^(بحث|ابحث)\s+/, '').toLowerCase();
            const results = store.products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
            await sock.sendMessage(remoteJid, { text: results.length ? `🔍 نتائج (${results.length}):\n\n${formatProductList(results)}` : `❌ لا توجد نتائج.` }, { quoted: msg });
            return;
        }

        if (body.startsWith('أضف ') || body.startsWith('اضف ')) {
            const pid = body.replace(/^(أضف|اضف)\s+/, '').trim();
            const product = store.products.find(p => p.id.toLowerCase() === pid.toLowerCase());
            if (!product) { await sock.sendMessage(remoteJid, { text: `❌ لا يوجد منتج ${pid}` }); return; }
            const existing = session.cart.find(i => i.id === product.id);
            if (existing) existing.qty++;
            else session.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
            await sock.sendMessage(remoteJid, { text: `✅ أُضيف *${product.name}* للسلة.` });
            return;
        }

        if (body === 'سلة' || body === '2') {
            if (session.cart.length === 0) { await sock.sendMessage(remoteJid, { text: `🛒 سلتك فارغة!` }); return; }
            const items = session.cart.map((it, i) => `${i + 1}. *${it.name}* (${it.qty} × ${it.price})`).join('\n');
            const total = getCartTotal(session.cart);
            await sock.sendMessage(remoteJid, { text: `🛒 *سلتك:*\n\n${items}\n\n💰 *الإجمالي: ${total} ${store.currency}*\n\n✅ *تأكيد* للشراء\n🗑️ *احذف [رقم]*` });
            return;
        }

        if (body.startsWith('احذف ')) {
            const idx = parseInt(body.replace('احذف ', '')) - 1;
            if (isNaN(idx) || !session.cart[idx]) { await sock.sendMessage(remoteJid, { text: `❌ رقم خاطئ.` }); return; }
            const removed = session.cart.splice(idx, 1)[0];
            await sock.sendMessage(remoteJid, { text: `🗑️ حُذف *${removed.name}*` });
            return;
        }

        if (body === 'إلغاء' || body === 'الغاء') {
            session.cart = [];
            await sock.sendMessage(remoteJid, { text: `❌ أُفرغت السلة.` });
            return;
        }

        if (body === 'تأكيد' || body === 'تاكيد') {
            if (session.cart.length === 0) { await sock.sendMessage(remoteJid, { text: `🛒 سلتك فارغة!` }); return; }
            session.state = 'waiting_address';
            await sock.sendMessage(remoteJid, { text: `📝 أرسل *العنوان الكامل*:` });
            return;
        }

        if (body === 'طلبي' || body === '3') {
            if (!session.lastOrder || !db.orders[session.lastOrder]) { await sock.sendMessage(remoteJid, { text: `📦 لا يوجد طلب سابق.` }); return; }
            const o = db.orders[session.lastOrder];
            await sock.sendMessage(remoteJid, { text: `📦 *${o.id}*\n📍 ${o.status}\n💰 ${o.total} ${store.currency}` });
            return;
        }

        if (body === 'طرق الدفع' || body === '5') {
            await sock.sendMessage(remoteJid, { text: `💳 *طرق الدفع:*\n\n${store.paymentMethods.map((m, i) => `${i + 1}. ${m}`).join('\n')}` });
            return;
        }

        if (body === 'الشحن' || body === '6') {
            const cities = Object.entries(store.shipping).map(([c, p]) => `• ${c}: ${p} ${store.currency}`).join('\n');
            await sock.sendMessage(remoteJid, { text: `🚚 *أسعار الشحن:*\n\n${cities}` });
            return;
        }

        if (body === 'أسئلة' || body === 'اسئلة' || body === '7') {
            const faqTxt = Object.entries(store.faq).map(([q, a]) => `❓ *${q}*\n${a}`).join('\n\n');
            await sock.sendMessage(remoteJid, { text: `❓ *الأسئلة الشائعة:*\n\n${faqTxt}` });
            return;
        }

        if (body === 'تواصل' || body === '8') {
            await sock.sendMessage(remoteJid, { text: `📞 *للتواصل:*\n\n📱 +${OWNER_NUMBER}` });
            return;
        }

        if (body === 'حسابي' || body === '9') {
            const u = db.users[sender];
            const rTitle = getRank(u.points);
            await sock.sendMessage(remoteJid, {
                text: `👤 *ملفك:*\n\n✨ @${sender.split('@')[0]}\n🏅 ${rTitle}\n💬 ${u.messages}\n✨ ${u.points}\n⚠️ روابط: ${u.linkWarns || 0}/3\n🎙️ صوت: ${u.audioWarns || 0}/7`,
                mentions: [sender]
            });
            return;
        }

        // 👑 معلومات المطور
        if (body === 'مطور') {
            await sock.sendMessage(remoteJid, {
                text: `👑 *معلومات المطور الرسمي*\n\n🖥️ *الاسم:* ${DEV_INFO.name}\n📞 *للتواصل:* wa.me/${DEV_INFO.contact}\n📢 *قناة واتساب:*\n${DEV_INFO.channel}\n\n💡 "البرمجة فن يحوّل الأفكار إلى حلول ذكية"`
            });
            return;
        }

        if (body === 'تذكير') {
            db.users[sender].isWaitingReminder = true;
            saveDB();
            await sock.sendMessage(remoteJid, { text: `📥 أرسل العبارة التي تريد تذكيرك بها.` });
            return;
        }

        if (body.startsWith('الحسابة')) {
            const expr = body.replace('الحسابة', '').trim();
            if (/[^0-9+\-×÷.\s]/.test(expr)) { await sock.sendMessage(remoteJid, { text: `❌ استخدم (+ - × ÷) فقط.` }); return; }
            try {
                const r = eval(expr.replace(/×/g, '*').replace(/÷/g, '/'));
                await sock.sendMessage(remoteJid, { text: `🧮 ${expr} = *${r}*` });
            } catch { await sock.sendMessage(remoteJid, { text: `❌ صيغة خاطئة.` }); }
            return;
        }

        // ========== أوامر المالك ==========
        if (owner) {
            if (body.startsWith('حالة ')) {
                const parts = body.split(' ');
                if (parts.length >= 3) {
                    const oid = parts[1].toUpperCase();
                    const newStatus = parts.slice(2).join(' ');
                    if (db.orders[oid]) {
                        db.orders[oid].status = newStatus;
                        saveDB();
                        await sock.sendMessage(remoteJid, { text: `✅ حالة الطلب *${oid}* → *${newStatus}*` });
                        try { await sock.sendMessage(db.orders[oid].customer + "@s.whatsapp.net", { text: `🔔 تحديث طلبك ${oid}: *${newStatus}*` }); } catch (e) {}
                    } else await sock.sendMessage(remoteJid, { text: `❌ لا يوجد طلب ${oid}` });
                }
                return;
            }

            if (body === 'إحصائيات' || body === 'احصائيات') {
                const totalOrders = Object.keys(db.orders).length;
                const pending = Object.values(db.orders).filter(o => o.status.includes('قيد')).length;
                await sock.sendMessage(remoteJid, {
                    text: `📊 *إحصائيات المتجر*\n\n📦 إجمالي الطلبات: ${totalOrders}\n⏳ قيد المراجعة: ${pending}\n💰 إجمالي المبيعات: ${db.stats.totalSales} ${store.currency}\n👥 المستخدمون: ${Object.keys(db.users).length}`
                });
                return;
            }

            if (body === 'المطور') {
                await sock.sendMessage(remoteJid, {
                    text: `👑 *المطور:* ${DEV_INFO.name}\n📞 ${DEV_INFO.contact}\n📢 ${DEV_INFO.channel}\n\n🔐 كلمة سر التحديث: محفوظة ✓`
                });
                return;
            }
        }
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log(`\n🚀 البوت يعمل!\n👑 المطور: ${DEV_INFO.name}\n📞 للتواصل: ${DEV_INFO.contact}\n📢 القناة: ${DEV_INFO.channel}\n`);
        }
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error.output.statusCode !== disconnectReason.loggedOut : true;
            console.log('🔄 إعادة الاتصال...');
            if (shouldReconnect) startBot();
        }
    });
}

startBot();