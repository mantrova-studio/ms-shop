DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS delivery_zones;
DROP TABLE IF EXISTS delivery_rules;
DROP TABLE IF EXISTS orders;

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_from INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  badges TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  svg TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_name TEXT NOT NULL,
  geojson TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE delivery_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL,
  min_order_sum INTEGER NOT NULL DEFAULT 0,
  delivery_price INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(zone_id) REFERENCES delivery_zones(id)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  contact_type TEXT DEFAULT '',
  contact_value TEXT DEFAULT '',
  address_text TEXT NOT NULL,
  lat REAL,
  lng REAL,
  zone_id INTEGER,
  delivery_price INTEGER NOT NULL DEFAULT 0,
  comment TEXT DEFAULT '',
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  operator_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings(key, value) VALUES
('site_name','MANTROVA STUDIO'),
('site_tagline','Мастерская подарков'),
('hero_title','Подарки с теплом, смыслом и красотой'),
('hero_text','Авторские подарки для особенных моментов: карта звёздного неба, именной шоколад и гипсовые фигурки для детей.'),
('about_text','MANTROVA STUDIO — мастерская красивых подарков с женственным премиальным стилем. Здесь рождаются подарки с личной историей, душой и заботой о деталях.'),
('founder_name','Основательница MANTROVA STUDIO'),
('founder_photo_url','https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop'),
('vk_url','https://vk.com/'),
('telegram_url','https://t.me/'),
('max_url','https://max.ru/'),
('rustore_url','https://www.rustore.ru/'),
('footer_text','© MANTROVA STUDIO — мастерская подарков');

INSERT INTO categories(slug, name, sort_order) VALUES
('star-map','Карта звёздного неба',1),
('alenka','Именной шоколад Алёнка',2),
('figures','Детские фигурки',3);

INSERT INTO products(category_id, slug, name, description, price_from, image_url, badges, active) VALUES
(1,'star-map-premium','Карта звёздного неба Premium','Персональная карта звёздного неба по дате и месту события. Несколько размеров и оформлений.',1900,'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=1200&auto=format&fit=crop','хит,персональный',1),
(2,'alenka-photo','Шоколад Алёнка с фото','Именной шоколад с фотографией, поздравлением и оформлением на выбор.',450,'https://images.unsplash.com/photo-1511381939415-e44015466834?q=80&w=1200&auto=format&fit=crop','подарок,с фото',1),
(3,'kids-figures-set','Набор гипсовых фигурок','Гипсовые фигурки для раскрашивания для детей. Большой ассортимент вариантов и наборов.',350,'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=1200&auto=format&fit=crop','детям,творчество',1);

INSERT INTO product_variants(product_id, name, sku, price) VALUES
(1,'A4 без рамки','MAP-A4-NF',1900),
(1,'A3 в рамке','MAP-A3-F',3200),
(2,'1 плитка','ALENKA-1',450),
(2,'Набор 5 плиток','ALENKA-5',1990),
(3,'1 фигурка','FIG-1',350),
(3,'Набор 3 фигурки + краски','FIG-3',990);

INSERT INTO banners(title, description, svg, active, sort_order) VALUES
('Нежные подарки','Индивидуальное оформление и тёплая подача для особенных событий.',NULL,1,1),
('Семейные моменты','Подарки к рождению ребёнка, дню рождения, годовщине и просто без повода.',NULL,1,2),
('Творчество для детей','Фигурки для раскрашивания, которые радуют и увлекают.',NULL,1,3);

INSERT INTO delivery_zones(admin_name, geojson, base_price, active) VALUES
('Центр', '{"type":"Polygon","coordinates":[[[55.05,51.76],[55.10,51.76],[55.10,51.80],[55.05,51.80],[55.05,51.76]]]}', 150, 1);

INSERT INTO delivery_rules(zone_id, min_order_sum, delivery_price) VALUES
(1,0,150),
(1,700,100),
(1,1500,0);
