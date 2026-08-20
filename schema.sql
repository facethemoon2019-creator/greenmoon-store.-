CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'نباتات',
  price REAL NOT NULL DEFAULT 0,
  old_price REAL,
  wholesale_cost REAL NOT NULL DEFAULT 0,
  extra_cost REAL NOT NULL DEFAULT 0,
  image TEXT,
  gallery TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  care TEXT NOT NULL DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  image TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  image TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL,
  subtotal REAL NOT NULL,
  shipping REAL NOT NULL DEFAULT 0,
  prize TEXT NOT NULL DEFAULT '',
  total REAL NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);

INSERT OR IGNORE INTO settings(key,value) VALUES
('site_name','Green Moon Plants & Flowers'),
('whatsapp','01151054863'),
('location','الدقي — داخل المتحف الزراعي'),
('shipping_text','توصيل لجميع أنحاء مصر'),
('min_profit','100'),
('max_profit','300'),
('flash_duration','60'),
('flash_gap','60');

INSERT OR IGNORE INTO categories(name,sort_order) VALUES
('البامبو',1),('البوتس',2),('النباتات الداخلية',3),('النباتات المزهرة',4),
('الفازات والإكسسوارات',5),('التربة والأسمدة',6),('العروض والباقات',7);

INSERT OR IGNORE INTO products(slug,name,category,price,old_price,wholesale_cost,extra_cost,image,description,care,stock,active,featured,created_at)
VALUES (
 'bamboo-curly-70cm','بامبو كيرلي 70 سم','البامبو',95,120,60,5,
 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85',
 'بامبو كيرلي أنيق مناسب للمنزل والمكتب، مع شكل ديكوري مميز.',
 '{"light":"إضاءة قوية غير مباشرة، وتجنب شمس الظهيرة المباشرة.","water":"غيّر المياه بانتظام وحافظ على نظافتها، أو اسقِ التربة عند جفاف سطحها حسب طريقة الزراعة.","temperature":"يفضل جوًا معتدلًا بعيدًا عن تيارات الهواء الساخنة والباردة.","humidity":"رطوبة متوسطة إلى مرتفعة مناسبة.","soil":"إذا كان مزروعًا في تربة استخدم تربة جيدة الصرف.","fertilizer":"سماد مناسب للنباتات الخضراء بجرعة خفيفة كل 4–6 أسابيع في موسم النمو.","shade":"نصف ظل / ضوء غير مباشر.","problems":"اصفرار الأوراق قد ينتج عن زيادة الماء أو ضعف الإضاءة أو مشكلة في الجذور.","tips":"نظف الوعاء والأوراق دوريًا ولا تضع النبات ملاصقًا لمصدر حرارة."}',
 20,1,1,datetime('now')
);

INSERT OR IGNORE INTO articles(slug,title,excerpt,content,image,active,created_at)
VALUES ('bamboo-care','دليل العناية بالبامبو','أهم النصائح للحفاظ على البامبو صحيًا وجميلًا.','ابدأ باختيار إضاءة مناسبة وتجنب شمس الظهيرة المباشرة. حافظ على نظافة المياه أو التربة وراقب لون الأوراق والجذور.','https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=85',1,datetime('now'));
