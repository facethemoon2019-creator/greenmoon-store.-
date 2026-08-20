const json = (data, status=200) =>
  new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json;charset=UTF-8","cache-control":"no-store"}});

const text = (body, status=200) =>
  new Response(body, {status, headers: {"content-type":"text/plain;charset=UTF-8"}});

const now = () => new Date().toISOString();

function careForCategory(category, existing = {}) {
  const c = (category || '').toLowerCase();
  const defaults = {
    light: 'إضاءة قوية غير مباشرة. تجنب شمس الظهيرة المباشرة ما لم يكن النبات يتحملها.',
    water: 'اسقِ عند جفاف الجزء المناسب من التربة، وتجنب ترك الجذور في مياه راكدة.',
    temperature: 'درجة حرارة معتدلة داخل المنزل، بعيدًا عن تيارات الهواء الشديدة.',
    humidity: 'رطوبة متوسطة، وتزداد الحاجة للرطوبة حسب نوع النبات.',
    soil: 'تربة جيدة الصرف ومناسبة لنوع النبات.',
    fertilizer: 'سماد متوازن بجرعة خفيفة خلال موسم النمو حسب تعليمات المنتج.',
    shade: 'ضوء غير مباشر / نصف ظل.',
    problems: 'راقب اصفرار الأوراق، الحشرات، وتعفن الجذور، وعدّل الري والإضاءة حسب الحاجة.',
    tips: 'نظف الأوراق دوريًا وغيّر الأصيص عند امتلاء الجذور.'
  };
  if (c.includes('بامبو')) Object.assign(defaults, {
    light:'ضوء قوي غير مباشر أو نصف ظل. تجنب شمس الظهيرة المباشرة.',
    water:'في الماء: حافظ على نظافة المياه وغيّرها دوريًا. في التربة: اسقِ باعتدال عند جفاف السطح.',
    humidity:'رطوبة متوسطة إلى مرتفعة.',
    fertilizer:'سماد مخفف جدًا كل 4–6 أسابيع في موسم النمو.'
  });
  if (c.includes('بوتس')) Object.assign(defaults, {
    light:'ضوء ساطع غير مباشر، ويتحمل الإضاءة المتوسطة.',
    water:'اسقِ بعد جفاف جزء من سطح التربة، وتجنب الإفراط.',
    humidity:'يتحمل رطوبة المنزل، ويفضل رطوبة متوسطة.',
    fertilizer:'سماد للنباتات الورقية كل 4–6 أسابيع في موسم النمو.'
  });
  if (c.includes('مزهر')) Object.assign(defaults, {
    light:'ضوء قوي غير مباشر، وقد تحتاج بعض الأنواع شمسًا صباحية لطيفة.',
    water:'حافظ على رطوبة منتظمة دون إغراق.',
    fertilizer:'سماد مناسب للنباتات المزهرة حسب تعليمات المنتج.'
  });
  return {...defaults, ...existing};
}

function slugify(s) {
  return String(s||'').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')
    .slice(0,80) || ('product-'+Date.now());
}

function signToken(payload, secret) {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'}, false, ['sign']).then(async key => {
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
      return data+'.'+b64;
    });
}

async function verifyToken(token, secret) {
  try {
    const [data, sig] = String(token||'').split('.');
    if (!data || !sig) return false;
    const payload = JSON.parse(decodeURIComponent(escape(atob(data))));
    if (payload.exp < Date.now()) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
      {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
    const bytes = Uint8Array.from(atob(sig), c=>c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(data));
  } catch { return false; }
}

async function adminOK(request, env) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SECRET) return false;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  return await verifyToken(token, env.ADMIN_SECRET);
}

async function safePrize(env, subtotal, items) {
  const minProfit = Number((await env.DB.prepare("SELECT value FROM settings WHERE key='min_profit'").first())?.value || 100);
  const candidates = [
    {name:'خصم 50 جنيه', cost:50, kind:'discount'},
    {name:'سماد صغير هدية', cost:20, kind:'gift'},
    {name:'أحجار ديكور هدية', cost:15, kind:'gift'},
    {name:'فازة ديكور هدية', cost:45, kind:'gift'},
    {name:'خصم 75 جنيه', cost:75, kind:'discount'}
  ];
  // The conservative rule: only prizes whose cost leaves at least minProfit
  // versus the estimated wholesale + extra cost of the current cart.
  let baseCost = 0;
  for (const i of items || []) {
    const p = await env.DB.prepare("SELECT wholesale_cost,extra_cost FROM products WHERE id=?").bind(i.id).first();
    baseCost += (Number(p?.wholesale_cost||0)+Number(p?.extra_cost||0))*Number(i.qty||1);
  }
  const eligible = candidates.filter(x => subtotal - baseCost - x.cost >= minProfit);
  if (!eligible.length) return {name:'مبروك! هدية رمزية مع الطلب', cost:0, kind:'gift'};
  return eligible[Math.floor(Math.random()*eligible.length)];
}

async function flashOffer(env) {
  const min = Number((await env.DB.prepare("SELECT value FROM settings WHERE key='min_profit'").first())?.value || 100);
  const max = Number((await env.DB.prepare("SELECT value FROM settings WHERE key='max_profit'").first())?.value || 300);
  const rows = (await env.DB.prepare("SELECT id,name,price,old_price,wholesale_cost,extra_cost,image,stock FROM products WHERE active=1 AND stock>0 ORDER BY RANDOM() LIMIT 30").all()).results;
  if (!rows.length) return null;
  // Build a 2–3 item package and price it to preserve the configured profit range.
  for (let tries=0; tries<20; tries++) {
    const count = Math.min(rows.length, 2 + Math.floor(Math.random()*2));
    const chosen = [...rows].sort(()=>Math.random()-0.5).slice(0,count);
    const cost = chosen.reduce((s,p)=>s+Number(p.wholesale_cost||0)+Number(p.extra_cost||0),0);
    const regular = chosen.reduce((s,p)=>s+Number(p.price||0),0);
    const targetProfit = Math.min(max, Math.max(min, Math.round(cost*0.35)));
    const price = Math.ceil((cost+targetProfit)/10)*10;
    if (price <= regular && price-cost >= min && price-cost <= max) {
      return {
        title:'عرض خاطف 🎁',
        items:chosen.map(p=>({id:p.id,name:p.name,price:p.price,image:p.image,qty:1})),
        regular, cost, price, profit:price-cost
      };
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'GET' && path === '/api/bootstrap') {
        const [products,categories,articles,settings] = await Promise.all([
          env.DB.prepare("SELECT * FROM products WHERE active=1 ORDER BY featured DESC,id DESC").all(),
          env.DB.prepare("SELECT * FROM categories WHERE active=1 ORDER BY sort_order,id").all(),
          env.DB.prepare("SELECT id,slug,title,excerpt,content,image,created_at FROM articles WHERE active=1 ORDER BY id DESC").all(),
          env.DB.prepare("SELECT key,value FROM settings").all()
        ]);
        return json({products:products.results,categories:categories.results,articles:articles.results,settings:Object.fromEntries(settings.results.map(x=>[x.key,x.value]))});
      }

      if (request.method === 'GET' && path.startsWith('/api/product/')) {
        const slug = decodeURIComponent(path.slice('/api/product/'.length));
        const p = await env.DB.prepare("SELECT * FROM products WHERE slug=? AND active=1").bind(slug).first();
        if (!p) return json({error:'المنتج غير موجود'},404);
        p.care = careForCategory(p.category, JSON.parse(p.care || '{}'));
        p.gallery = JSON.parse(p.gallery || '[]');
        return json(p);
      }

      if (request.method === 'GET' && path === '/api/flash-offer') {
        const offer = await flashOffer(env);
        return json(offer || {title:'تابعنا لعروض جديدة 🎁'});
      }

      if (request.method === 'POST' && path === '/api/admin/login') {
        const {password} = await request.json();
        if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) return json({error:'بيانات الدخول غير صحيحة'},401);
        const token = await signToken({exp:Date.now()+1000*60*60*8}, env.ADMIN_SECRET);
        return json({token});
      }

      if (path.startsWith('/api/admin/')) {
        if (!(await adminOK(request,env))) return json({error:'غير مصرح'},401);

        if (request.method === 'GET' && path === '/api/admin/products') {
          return json((await env.DB.prepare("SELECT * FROM products ORDER BY id DESC").all()).results);
        }
        if (request.method === 'POST' && path === '/api/admin/products') {
          const b = await request.json();
          const slug = b.slug || slugify(b.name);
          const care = careForCategory(b.category,b.care||{});
          await env.DB.prepare(`INSERT INTO products
            (slug,name,category,price,old_price,wholesale_cost,extra_cost,image,gallery,description,care,stock,active,featured,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            .bind(slug,b.name,b.category||'نباتات',Number(b.price||0),b.old_price===''?null:Number(b.old_price||0),
              Number(b.wholesale_cost||0),Number(b.extra_cost||0),b.image||'',JSON.stringify(b.gallery||[]),
              b.description||'',JSON.stringify(care),Number(b.stock||0),b.active===false?0:1,b.featured?1:0,now()).run();
          return json({ok:true,slug});
        }
        if (request.method === 'PUT' && path.startsWith('/api/admin/products/')) {
          const id = Number(path.split('/').pop()); const b = await request.json();
          const old = await env.DB.prepare("SELECT * FROM products WHERE id=?").bind(id).first();
          if (!old) return json({error:'المنتج غير موجود'},404);
          const care = careForCategory(b.category||old.category,b.care || JSON.parse(old.care||'{}'));
          await env.DB.prepare(`UPDATE products SET slug=?,name=?,category=?,price=?,old_price=?,wholesale_cost=?,extra_cost=?,image=?,gallery=?,description=?,care=?,stock=?,active=?,featured=? WHERE id=?`)
            .bind(b.slug||old.slug,b.name||old.name,b.category||old.category,Number(b.price??old.price),
              b.old_price===''?null:Number(b.old_price??old.old_price),Number(b.wholesale_cost??old.wholesale_cost),
              Number(b.extra_cost??old.extra_cost),b.image??old.image,JSON.stringify(b.gallery||JSON.parse(old.gallery||'[]')),
              b.description??old.description,JSON.stringify(care),Number(b.stock??old.stock),b.active===false?0:1,b.featured?1:0,id).run();
          return json({ok:true});
        }
        if (request.method === 'DELETE' && path.startsWith('/api/admin/products/')) {
          const id=Number(path.split('/').pop());
          await env.DB.prepare("UPDATE products SET active=0 WHERE id=?").bind(id).run();
          return json({ok:true});
        }

        if (request.method === 'GET' && path === '/api/admin/orders') {
          return json((await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC").all()).results);
        }
        if (request.method === 'PUT' && path.startsWith('/api/admin/orders/')) {
          const id=Number(path.split('/').pop()); const {status}=await request.json();
          await env.DB.prepare("UPDATE orders SET status=? WHERE id=?").bind(status,id).run();
          return json({ok:true});
        }

        if (request.method === 'GET' && path === '/api/admin/articles') {
          return json((await env.DB.prepare("SELECT * FROM articles ORDER BY id DESC").all()).results);
        }
        if (request.method === 'POST' && path === '/api/admin/articles') {
          const b=await request.json();
          await env.DB.prepare("INSERT INTO articles(slug,title,excerpt,content,image,active,created_at) VALUES(?,?,?,?,?,?,?)")
            .bind(b.slug||slugify(b.title),b.title,b.excerpt||'',b.content||'',b.image||'',b.active===false?0:1,now()).run();
          return json({ok:true});
        }
        if (request.method === 'PUT' && path.startsWith('/api/admin/articles/')) {
          const id=Number(path.split('/').pop()); const b=await request.json();
          await env.DB.prepare("UPDATE articles SET slug=?,title=?,excerpt=?,content=?,image=?,active=? WHERE id=?")
            .bind(b.slug||slugify(b.title),b.title,b.excerpt||'',b.content||'',b.image||'',b.active===false?0:1,id).run();
          return json({ok:true});
        }
        if (request.method === 'DELETE' && path.startsWith('/api/admin/articles/')) {
          const id=Number(path.split('/').pop()); await env.DB.prepare("UPDATE articles SET active=0 WHERE id=?").bind(id).run(); return json({ok:true});
        }

        if (request.method === 'GET' && path === '/api/admin/categories') return json((await env.DB.prepare("SELECT * FROM categories ORDER BY sort_order,id").all()).results);
        if (request.method === 'POST' && path === '/api/admin/categories') {
          const b=await request.json(); await env.DB.prepare("INSERT INTO categories(name,image,active,sort_order) VALUES(?,?,?,?)").bind(b.name,b.image||'',b.active===false?0:1,Number(b.sort_order||0)).run(); return json({ok:true});
        }
        if (request.method === 'PUT' && path.startsWith('/api/admin/categories/')) {
          const id=Number(path.split('/').pop()), b=await request.json();
          await env.DB.prepare("UPDATE categories SET name=?,image=?,active=?,sort_order=? WHERE id=?").bind(b.name,b.image||'',b.active===false?0:1,Number(b.sort_order||0),id).run(); return json({ok:true});
        }
        if (request.method === 'DELETE' && path.startsWith('/api/admin/categories/')) {
          const id=Number(path.split('/').pop()); await env.DB.prepare("UPDATE categories SET active=0 WHERE id=?").bind(id).run(); return json({ok:true});
        }

        if (request.method === 'GET' && path === '/api/admin/settings') return json(Object.fromEntries((await env.DB.prepare("SELECT key,value FROM settings").all()).results.map(x=>[x.key,x.value])));
        if (request.method === 'PUT' && path === '/api/admin/settings') {
          const b=await request.json();
          for (const [k,v] of Object.entries(b)) await env.DB.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k,String(v)).run();
          return json({ok:true});
        }
        return json({error:'مسار إدارة غير معروف'},404);
      }

      if (request.method === 'POST' && path === '/api/order') {
        const b=await request.json();
        if (!b?.customer?.name || !b?.customer?.phone || !b?.customer?.address || !Array.isArray(b.items) || !b.items.length)
          return json({error:'يرجى استكمال بيانات العميل والمنتجات'},400);

        // Recalculate prices server-side.
        let subtotal=0, items=[];
        for (const item of b.items) {
          const p=await env.DB.prepare("SELECT id,name,price,stock,active FROM products WHERE id=?").bind(Number(item.id)).first();
          const qty=Math.max(1,Math.min(99,Number(item.qty||1)));
          if (!p || !p.active || p.stock < qty) return json({error:`الكمية غير متاحة للمنتج: ${p?.name||'غير معروف'}`},400);
          subtotal += Number(p.price)*qty;
          items.push({id:p.id,name:p.name,price:Number(p.price),qty});
        }
        const prize = b.prize ? await safePrize(env,subtotal,items) : {name:'',cost:0,kind:''};
        const total=Math.max(0,subtotal-(prize.kind==='discount'?prize.cost:0));
        await env.DB.prepare(`INSERT INTO orders(customer_name,phone,address,notes,items,subtotal,shipping,prize,total,created_at,status)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(
          b.customer.name,b.customer.phone,b.customer.address,b.notes||'',JSON.stringify(items),subtotal,0,prize.name,total,now(),'new'
        ).run();

        const lines=items.map(i=>`• ${i.name} × ${i.qty} = ${i.price*i.qty} ج`).join('\n');
        const wa=`طلب جديد من Green Moon 🌿\n\n👤 ${b.customer.name}\n📱 ${b.customer.phone}\n📍 ${b.customer.address}\n\n${lines}\n\n🎁 الجائزة: ${prize.name||'لا توجد'}\n💰 الإجمالي: ${total} جنيه`;
        return json({ok:true,prize,total,whatsapp:`https://wa.me/201151054863?text=${encodeURIComponent(wa)}`});
      }

      // Dynamic product/article routes are rendered by the frontend; send index.
      if (path === '/' || path === '/store' || path === '/admin' || path.startsWith('/product/') || path.startsWith('/magazine/')) {
        return env.ASSETS.fetch(new Request(new URL('/index.html',url), request));
      }
      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({error:'حدث خطأ في الخادم',detail:String(e?.message||e)},500);
    }
  }
};
