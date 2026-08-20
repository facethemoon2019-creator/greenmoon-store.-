# نشر Green Moon مجانًا على Cloudflare Workers + D1

## 1) المتطلبات
- حساب Cloudflare مجاني.
- Node.js + npm.
- Wrangler: `npm install -g wrangler`
- سجل الدخول: `npx wrangler login`

## 2) إنشاء قاعدة البيانات
نفّذ:
`npx wrangler d1 create greenmoon`

انسخ `database_id` الناتج وضعه بدل `REPLACE_WITH_D1_DATABASE_ID` في `wrangler.toml`.

ثم:
`npx wrangler d1 execute greenmoon --remote --file=./schema.sql`

## 3) إعداد كلمة مرور لوحة التحكم
اختر كلمة مرور قوية ثم:
`npx wrangler secret put ADMIN_PASSWORD`
ثم أدخل كلمة المرور.

أنشئ سر التوقيع:
`npx wrangler secret put ADMIN_SECRET`
واستخدم قيمة عشوائية طويلة.

## 4) النشر
`npx wrangler deploy`

سيعطيك رابطًا مثل:
`https://greenmoon-store.<subdomain>.workers.dev`

## 5) ما هو موجود
- واجهة متجر RTL متجاوبة.
- بحث.
- تصنيفات.
- منتجات وأسعار قبل/بعد.
- + / - للكمية.
- سلة.
- صفحات منتجات مستقلة.
- دليل عناية تلقائي حسب التصنيف.
- مجلة.
- لوحة تحكم.
- سعر جملة + تكلفة إضافية.
- مولّد عروض خاطفة يحاول الحفاظ على مكسب داخل الحد المحدد.
- باراشوت للعروض + عداد.
- كارت خدش.
- تسجيل الطلب في D1.
- إرسال الطلب إلى واتساب 01151054863.

## ملاحظة
النسخة تعتمد على روابط صور للمنتجات. يمكن إضافة R2 لاحقًا لرفع الصور من داخل لوحة التحكم.
