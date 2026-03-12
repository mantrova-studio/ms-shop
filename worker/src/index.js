export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const { pathname } = url;
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, x-admin-token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      };
      if (request.method === 'OPTIONS') return new Response('', { headers: corsHeaders });

      if (pathname === '/api/bootstrap' && request.method === 'GET') {
        return json(await getBootstrap(env), corsHeaders);
      }
      if (pathname === '/api/orders' && request.method === 'POST') {
        const body = await request.json();
        const order = await createOrder(body, env);
        await sendTelegram(order, env).catch(console.error);
        return json(order, corsHeaders);
      }
      if (pathname === '/api/admin/login' && request.method === 'POST') {
        const body = await request.json();
        if (body.password !== env.ADMIN_PASSWORD) return new Response('Неверный пароль', { status: 401, headers: corsHeaders });
        return json({ token: env.ADMIN_PASSWORD }, corsHeaders);
      }

      if (pathname.startsWith('/api/admin/')) {
        if (request.headers.get('x-admin-token') !== env.ADMIN_PASSWORD) return new Response('Нет доступа', { status: 401, headers: corsHeaders });
        return handleAdmin(request, env, pathname, corsHeaders);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(err.stack || err.message || 'Server error', { status: 500 });
    }
  }
};

async function handleAdmin(request, env, pathname, corsHeaders) {
  if (pathname === '/api/admin/bootstrap' && request.method === 'GET') {
    const boot = await getBootstrap(env);
    const variants = await env.DB.prepare('SELECT * FROM product_variants ORDER BY id DESC').all();
    return json({ ...boot, variants: variants.results }, corsHeaders);
  }
  if (pathname === '/api/admin/settings' && request.method === 'PUT') {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      await env.DB.prepare('INSERT INTO settings(key, value) VALUES(?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, String(value || '')).run();
    }
    return json({ ok: true }, corsHeaders);
  }
  if (pathname === '/api/admin/products' && request.method === 'POST') {
    const body = await request.json();
    const result = await env.DB.prepare(`INSERT INTO products(category_id, slug, name, description, price_from, image_url, badges, active)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`).bind(body.category_id, body.slug, body.name, body.description || '', body.price_from, body.image_url || '', body.badges || '', body.active ? 1 : 0).run();
    const id = result.meta.last_row_id;
    await replaceVariants(id, body.variants || [], env);
    return json({ ok: true, id }, corsHeaders);
  }
  if (/^\/api\/admin\/products\/\d+$/.test(pathname) && request.method === 'PUT') {
    const id = pathname.split('/').pop();
    const body = await request.json();
    await env.DB.prepare(`UPDATE products SET category_id=?1, slug=?2, name=?3, description=?4, price_from=?5, image_url=?6, badges=?7, active=?8 WHERE id=?9`)
      .bind(body.category_id, body.slug, body.name, body.description || '', body.price_from, body.image_url || '', body.badges || '', body.active ? 1 : 0, id).run();
    await replaceVariants(id, body.variants || [], env);
    return json({ ok: true }, corsHeaders);
  }
  if (/^\/api\/admin\/products\/\d+$/.test(pathname) && request.method === 'DELETE') {
    const id = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM product_variants WHERE product_id=?1').bind(id).run();
    await env.DB.prepare('DELETE FROM products WHERE id=?1').bind(id).run();
    return json({ ok: true }, corsHeaders);
  }
  if (pathname === '/api/admin/zones' && request.method === 'POST') {
    const b = await request.json();
    await env.DB.prepare('INSERT INTO delivery_zones(admin_name, geojson, base_price, active) VALUES(?1,?2,?3,1)').bind(b.admin_name, b.geojson, b.base_price).run();
    return json({ ok: true }, corsHeaders);
  }
  if (/^\/api\/admin\/zones\/\d+$/.test(pathname) && request.method === 'PUT') {
    const id = pathname.split('/').pop(); const b = await request.json();
    await env.DB.prepare('UPDATE delivery_zones SET admin_name=?1, geojson=?2, base_price=?3 WHERE id=?4').bind(b.admin_name, b.geojson, b.base_price, id).run();
    return json({ ok: true }, corsHeaders);
  }
  if (/^\/api\/admin\/zones\/\d+$/.test(pathname) && request.method === 'DELETE') {
    const id = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM delivery_rules WHERE zone_id=?1').bind(id).run();
    await env.DB.prepare('DELETE FROM delivery_zones WHERE id=?1').bind(id).run();
    return json({ ok: true }, corsHeaders);
  }
  if (pathname === '/api/admin/rules' && request.method === 'POST') {
    const b = await request.json();
    await env.DB.prepare('INSERT INTO delivery_rules(zone_id, min_order_sum, delivery_price) VALUES(?1,?2,?3)').bind(b.zone_id, b.min_order_sum, b.delivery_price).run();
    return json({ ok: true }, corsHeaders);
  }
  if (/^\/api\/admin\/rules\/\d+$/.test(pathname) && request.method === 'DELETE') {
    const id = pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM delivery_rules WHERE id=?1').bind(id).run();
    return json({ ok: true }, corsHeaders);
  }
  if (pathname === '/api/admin/orders' && request.method === 'GET') {
    const orders = await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    return json({ orders: orders.results }, corsHeaders);
  }
  if (/^\/api\/admin\/orders\/\d+$/.test(pathname) && request.method === 'PUT') {
    const id = pathname.split('/').pop(); const b = await request.json();
    await env.DB.prepare('UPDATE orders SET status=?1, operator_note=?2, updated_at=CURRENT_TIMESTAMP WHERE id=?3').bind(b.status, b.operator_note || '', id).run();
    return json({ ok: true }, corsHeaders);
  }
  return new Response('Not found', { status:404, headers: corsHeaders });
}

async function replaceVariants(productId, variants, env) {
  await env.DB.prepare('DELETE FROM product_variants WHERE product_id=?1').bind(productId).run();
  for (const v of variants) {
    await env.DB.prepare('INSERT INTO product_variants(product_id, name, sku, price) VALUES(?1,?2,?3,?4)').bind(productId, v.name, v.sku || '', v.price).run();
  }
}

async function getBootstrap(env) {
  const settingsRows = await env.DB.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(settingsRows.results.map(r => [r.key, r.value]));
  const categories = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  const products = await env.DB.prepare(`SELECT p.*, c.slug as category_slug, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC`).all();
  const banners = await env.DB.prepare('SELECT * FROM banners WHERE active=1 ORDER BY sort_order, id').all();
  const zones = await env.DB.prepare('SELECT * FROM delivery_zones WHERE active=1 ORDER BY id DESC').all();
  const rules = await env.DB.prepare('SELECT * FROM delivery_rules ORDER BY zone_id, min_order_sum').all();
  return { settings, categories: categories.results, products: products.results, banners: banners.results, zones: zones.results, rules: rules.results };
}

async function createOrder(body, env) {
  if (!body.customer_name || !body.phone || !body.address_text || !Array.isArray(body.items) || !body.items.length) throw new Error('Не заполнены обязательные поля');
  const subtotal = body.items.reduce((a, i) => a + Number(i.price) * Number(i.qty), 0);
  const zones = (await env.DB.prepare('SELECT * FROM delivery_zones WHERE active=1').all()).results;
  const rules = (await env.DB.prepare('SELECT * FROM delivery_rules ORDER BY min_order_sum ASC').all()).results;
  let zone = null;
  if (body.lat && body.lng) {
    const point = [Number(body.lng), Number(body.lat)];
    zone = zones.find(z => pointInGeoJSON(point, JSON.parse(z.geojson)));
  }
  let delivery_price = zone ? Number(zone.base_price) : 0;
  const zoneRules = rules.filter(r => Number(r.zone_id) === Number(zone?.id));
  for (const rule of zoneRules) if (subtotal >= Number(rule.min_order_sum)) delivery_price = Number(rule.delivery_price);
  const total = subtotal + delivery_price;
  const order_number = Date.now().toString().slice(-6);
  const created = await env.DB.prepare(`INSERT INTO orders(order_number, customer_name, phone, contact_type, contact_value, address_text, lat, lng, zone_id, delivery_price, comment, items_json, subtotal, total, status, operator_note)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,'new','')`)
    .bind(order_number, body.customer_name, body.phone, body.contact_type || '', body.contact_value || '', body.address_text, body.lat || null, body.lng || null, zone?.id || null, delivery_price, body.comment || '', JSON.stringify(body.items), subtotal, total).run();
  return { id: created.meta.last_row_id, order_number, subtotal, delivery_price, total, zone: zone?.admin_name || null };
}

async function sendTelegram(order, env) {
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;
  const text = [
    `🛍 Новый заказ #${order.order_number}`,
    `Сумма: ${order.total} ₽`,
    `Доставка: ${order.delivery_price} ₽`,
    order.zone ? `Зона: ${order.zone}` : ''
  ].filter(Boolean).join('\n');
  await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text })
  });
}

function pointInGeoJSON(point, geojson) {
  if (!geojson) return false;
  if (geojson.type === 'Polygon') return pointInPolygon(point, geojson.coordinates[0]);
  if (geojson.type === 'MultiPolygon') return geojson.coordinates.some(poly => pointInPolygon(point, poly[0]));
  return false;
}

function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1], xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function json(data, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
}
