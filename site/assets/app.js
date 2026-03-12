const API_BASE = window.API_BASE || '/api';
const state = {
  bootstrap: null,
  cart: JSON.parse(localStorage.getItem('mantrova_cart') || '[]'),
  category: 'all'
};

const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];
const rub = n => new Intl.NumberFormat('ru-RU').format(Number(n || 0)) + ' ₽';

function saveCart(){ localStorage.setItem('mantrova_cart', JSON.stringify(state.cart)); }
function toast(msg){ alert(msg); }

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) throw new Error((await res.text()) || 'Ошибка запроса');
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
}

function cartCount(){ return state.cart.reduce((a, i) => a + i.qty, 0); }
function cartTotal(){ return state.cart.reduce((a, i) => a + i.qty * i.price, 0); }
function syncCartBadges(){ qsa('[data-cart-count]').forEach(el => el.textContent = cartCount()); }

function addToCart(product, variant = null){
  const key = `${product.id}:${variant?.id || 'base'}`;
  const title = variant ? `${product.name} — ${variant.name}` : product.name;
  const price = variant?.price || product.price_from;
  const found = state.cart.find(i => i.key === key);
  if (found) found.qty += 1;
  else state.cart.push({ key, product_id: product.id, variant_id: variant?.id || null, name: title, price, image_url: product.image_url || '', qty: 1 });
  saveCart();
  syncCartBadges();
  renderCart();
  toast('Товар добавлен в корзину');
}

function updateQty(key, delta){
  const item = state.cart.find(i => i.key === key);
  if (!item) return;
  item.qty += delta;
  state.cart = state.cart.filter(i => i.qty > 0);
  saveCart();
  syncCartBadges();
  renderCart();
}

function renderCards(){
  const grid = qs('#productGrid');
  if (!grid || !state.bootstrap) return;
  const products = state.bootstrap.products.filter(p => p.active === 1 || p.active === true)
    .filter(p => state.category === 'all' ? true : p.category_slug === state.category);
  grid.innerHTML = products.map(p => `
    <article class="panel card">
      <div class="card-media">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : `<div style="font-size:44px">🎁</div>`}</div>
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
        <div class="card-desc">${p.description || ''}</div>
        <div class="meta">
          <span class="tag">${p.category_name || ''}</span>
          ${(p.badges || '').split(',').filter(Boolean).map(t => `<span class="tag">${t.trim()}</span>`).join('')}
        </div>
        <div class="price-row">
          <div class="price">от ${rub(p.price_from)}</div>
          <button class="btn" data-add="${p.id}">В корзину</button>
        </div>
      </div>
    </article>`).join('');

  qsa('[data-add]').forEach(btn => btn.onclick = () => {
    const p = state.bootstrap.products.find(x => String(x.id) === btn.dataset.add);
    addToCart(p);
  });
}

function renderCategories(){
  const wrap = qs('#categoryPills');
  if (!wrap || !state.bootstrap) return;
  wrap.innerHTML = [`<button class="pill ${state.category==='all'?'active':''}" data-cat="all">Все товары</button>`]
    .concat(state.bootstrap.categories.map(c => `<button class="pill ${state.category===c.slug?'active':''}" data-cat="${c.slug}">${c.name}</button>`)).join('');
  qsa('[data-cat]', wrap).forEach(btn => btn.onclick = () => { state.category = btn.dataset.cat; renderCategories(); renderCards(); });
}

function renderBanners(){
  const wrap = qs('#bannerGrid');
  if (!wrap || !state.bootstrap) return;
  wrap.innerHTML = state.bootstrap.banners.map(b => `
    <article class="panel banner">
      ${b.svg || defaultBannerSvg()}
      <div class="banner-content">
        <h3>${b.title}</h3>
        <p>${b.description || ''}</p>
      </div>
    </article>`).join('');
}

function defaultBannerSvg(){
  return `<svg viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="400" rx="36" fill="url(#g)"/><circle cx="500" cy="80" r="130" fill="#fff" fill-opacity=".32"/><circle cx="130" cy="360" r="120" fill="#fff" fill-opacity=".22"/><path d="M0 300C120 220 200 360 340 290C450 235 520 175 600 220V400H0V300Z" fill="#fff" fill-opacity=".35"/><defs><linearGradient id="g" x1="0" y1="0" x2="600" y2="400"><stop stop-color="#FFE0EA"/><stop offset="1" stop-color="#F6B3C6"/></linearGradient></defs></svg>`;
}

function renderContacts(){
  const wrap = qs('#socials');
  if (!wrap || !state.bootstrap) return;
  const c = state.bootstrap.settings;
  const links = [
    ['VK', c.vk_url], ['Telegram', c.telegram_url], ['Max', c.max_url], ['RuStore', c.rustore_url]
  ].filter(x => x[1]);
  wrap.innerHTML = links.map(([name, url]) => `<a class="social" href="${url}" target="_blank" rel="noreferrer">${name}</a>`).join('');
}

function openCart(){ qs('#cartDrawer')?.classList.add('open'); qs('#overlay')?.classList.add('show'); renderCart(); }
function closeCart(){ qs('#cartDrawer')?.classList.remove('open'); qs('#overlay')?.classList.remove('show'); }

function renderCart(){
  const body = qs('#cartItems');
  const total = qs('#cartTotal');
  if (!body) return;
  if (!state.cart.length) body.innerHTML = `<div class="notice muted">Корзина пока пустая.</div>`;
  else body.innerHTML = state.cart.map(i => `
    <div class="cart-item">
      <img class="cart-item-thumb" src="${i.image_url || ''}" alt="${i.name}">
      <div>
        <div style="font-weight:800">${i.name}</div>
        <div class="muted" style="margin-top:6px">${rub(i.price)}</div>
        <div class="qty" style="margin-top:12px">
          <button data-qty="-1" data-key="${i.key}">−</button>
          <strong>${i.qty}</strong>
          <button data-qty="1" data-key="${i.key}">+</button>
        </div>
      </div>
      <div style="font-weight:900">${rub(i.price * i.qty)}</div>
    </div>`).join('');
  total && (total.textContent = rub(cartTotal()));
  qsa('[data-qty]', body).forEach(btn => btn.onclick = () => updateQty(btn.dataset.key, Number(btn.dataset.qty)));
}

async function handleCheckout(e){
  e.preventDefault();
  if (!state.cart.length) return toast('Корзина пустая');
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    customer_name: data.customer_name,
    phone: data.phone,
    contact_type: data.contact_type,
    contact_value: data.contact_value,
    address_text: data.address_text,
    comment: data.comment,
    items: state.cart.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, name: i.name, price: i.price, qty: i.qty })),
    lat: data.lat || null,
    lng: data.lng || null
  };
  try {
    const result = await api('/orders', { method: 'POST', body: JSON.stringify(payload) });
    toast(`Заказ №${result.order_number} отправлен`);
    state.cart = []; saveCart(); syncCartBadges(); renderCart(); form.reset();
  } catch (err) { toast(err.message); }
}

async function initStorefront(){
  try {
    state.bootstrap = await api('/bootstrap');
    const s = state.bootstrap.settings;
    document.title = s.site_name || 'MANTROVA STUDIO';
    qs('#brandTitle') && (qs('#brandTitle').textContent = s.site_name || 'MANTROVA STUDIO');
    qs('#brandSub') && (qs('#brandSub').textContent = s.site_tagline || 'Мастерская подарков');
    qs('#heroTitle') && (qs('#heroTitle').textContent = s.hero_title || 'Подарки с теплом, смыслом и красотой');
    qs('#heroText') && (qs('#heroText').textContent = s.hero_text || 'Авторские подарки для особенных моментов.');
    qs('#aboutText') && (qs('#aboutText').textContent = s.about_text || '');
    qs('#founderName') && (qs('#founderName').textContent = s.founder_name || 'Основательница мастерской');
    qs('#founderPhoto') && s.founder_photo_url && (qs('#founderPhoto').src = s.founder_photo_url);
    qs('#footerText') && (qs('#footerText').textContent = s.footer_text || '© MANTROVA STUDIO');
    renderCategories(); renderCards(); renderBanners(); renderContacts(); renderCart(); syncCartBadges();
  } catch (err) {
    console.error(err);
    toast('Не удалось загрузить сайт. Проверьте API.');
  }
}

// admin
const adminState = { token: localStorage.getItem('mantrova_admin_token') || '' };
function authHeaders(){ return adminState.token ? { 'x-admin-token': adminState.token } : {}; }
async function adminApi(path, options = {}) { return api('/admin' + path, { ...options, headers: { ...authHeaders(), ...(options.headers||{}) } }); }

async function handleAdminLogin(e){
  e.preventDefault();
  const password = new FormData(e.target).get('password');
  const res = await api('/admin/login', { method:'POST', body: JSON.stringify({ password }) });
  adminState.token = res.token; localStorage.setItem('mantrova_admin_token', res.token); qs('#loginBox').classList.add('hidden'); qs('#adminApp').classList.remove('hidden'); await loadAdmin();
}

async function loadAdmin(){
  const data = await adminApi('/bootstrap');
  window.__admin = data;
  const s = data.settings;
  ['site_name','site_tagline','hero_title','hero_text','about_text','founder_name','founder_photo_url','vk_url','telegram_url','max_url','rustore_url','footer_text'].forEach(k=>{ const el = qs(`[name="${k}"]`); if(el) el.value = s[k] || ''; });
  renderAdminProducts(); renderAdminDelivery();
}

function switchAdminSection(name){ qsa('.content-section').forEach(s => s.classList.toggle('active', s.dataset.section===name)); qsa('.menu button').forEach(b => b.classList.toggle('active', b.dataset.section===name)); }

async function saveAppearance(e){
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target).entries());
  await adminApi('/settings', { method:'PUT', body: JSON.stringify(payload) });
  toast('Настройки сохранены');
}

function renderAdminProducts(){
  const wrap = qs('#productsTable'); if (!wrap || !window.__admin) return;
  wrap.innerHTML = window.__admin.products.map(p => `<tr>
    <td>${p.id}</td><td>${p.name}</td><td>${p.category_name||''}</td><td>${rub(p.price_from)}</td><td>${p.active ? 'Да':'Нет'}</td>
    <td><button class="btn-soft" data-edit-product="${p.id}">Изменить</button> <button class="btn-soft" data-del-product="${p.id}">Удалить</button></td>
  </tr>`).join('');
  qsa('[data-edit-product]').forEach(b => b.onclick = () => openProductModal(b.dataset.editProduct));
  qsa('[data-del-product]').forEach(b => b.onclick = async () => { if(confirm('Удалить товар?')){ await adminApi(`/products/${b.dataset.delProduct}`, { method:'DELETE' }); await loadAdmin(); } });
}

function openProductModal(id = null){
  const data = window.__admin;
  const p = id ? data.products.find(x => String(x.id)===String(id)) : { active:1 };
  const variants = id ? data.variants.filter(v => String(v.product_id)===String(id)) : [];
  qs('#productModal').classList.add('show');
  qs('#productForm').dataset.id = id || '';
  qs('#productForm').innerHTML = `
    <div class="form-grid">
      <div class="field"><span class="label">Название</span><input class="input" name="name" value="${p.name||''}" required></div>
      <div class="field"><span class="label">Slug</span><input class="input" name="slug" value="${p.slug||''}" required></div>
      <div class="field"><span class="label">Категория</span><select class="select" name="category_id">${data.categories.map(c => `<option value="${c.id}" ${String(c.id)===String(p.category_id)?'selected':''}>${c.name}</option>`).join('')}</select></div>
      <div class="field"><span class="label">Цена от</span><input class="input" type="number" name="price_from" value="${p.price_from||0}" required></div>
      <div class="field full"><span class="label">Описание</span><textarea class="textarea" name="description">${p.description||''}</textarea></div>
      <div class="field"><span class="label">Фото URL</span><input class="input" name="image_url" value="${p.image_url||''}"></div>
      <div class="field"><span class="label">Бейджи через запятую</span><input class="input" name="badges" value="${p.badges||''}"></div>
      <div class="field"><span class="label">Активен</span><select class="select" name="active"><option value="1" ${p.active?'selected':''}>Да</option><option value="0" ${!p.active?'selected':''}>Нет</option></select></div>
      <div class="field"><span class="label">Варианты JSON</span><textarea class="textarea" name="variants_json">${JSON.stringify(variants.map(v => ({name:v.name,price:v.price,sku:v.sku||''})), null, 2)}</textarea></div>
    </div>`;
}

async function saveProduct(e){
  e.preventDefault();
  const form = e.target; const id = form.dataset.id;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.active = Number(payload.active);
  payload.price_from = Number(payload.price_from);
  payload.variants = JSON.parse(payload.variants_json || '[]');
  delete payload.variants_json;
  if (id) await adminApi(`/products/${id}`, { method:'PUT', body: JSON.stringify(payload) });
  else await adminApi('/products', { method:'POST', body: JSON.stringify(payload) });
  qs('#productModal').classList.remove('show');
  await loadAdmin();
}

function renderAdminDelivery(){
  const zones = qs('#zonesTable'); const rules = qs('#rulesTable'); if (!window.__admin || !zones || !rules) return;
  zones.innerHTML = window.__admin.zones.map(z => `<tr><td>${z.id}</td><td>${z.admin_name}</td><td>${rub(z.base_price)}</td><td><button class="btn-soft" data-edit-zone="${z.id}">Изменить</button> <button class="btn-soft" data-del-zone="${z.id}">Удалить</button></td></tr>`).join('');
  rules.innerHTML = window.__admin.rules.map(r => `<tr><td>${r.id}</td><td>${r.zone_id}</td><td>${r.min_order_sum}</td><td>${rub(r.delivery_price)}</td><td><button class="btn-soft" data-del-rule="${r.id}">Удалить</button></td></tr>`).join('');
  qsa('[data-edit-zone]').forEach(b => b.onclick = () => openZoneModal(b.dataset.editZone));
  qsa('[data-del-zone]').forEach(b => b.onclick = async () => { if(confirm('Удалить зону?')){ await adminApi(`/zones/${b.dataset.delZone}`, { method:'DELETE' }); await loadAdmin(); }});
  qsa('[data-del-rule]').forEach(b => b.onclick = async () => { if(confirm('Удалить правило?')){ await adminApi(`/rules/${b.dataset.delRule}`, { method:'DELETE' }); await loadAdmin(); }});
}

function openZoneModal(id = null){
  const z = id ? window.__admin.zones.find(x => String(x.id)===String(id)) : {};
  qs('#zoneModal').classList.add('show');
  qs('#zoneForm').dataset.id = id || '';
  qs('#zoneForm').innerHTML = `
    <div class="form-grid">
      <div class="field"><span class="label">Название зоны</span><input class="input" name="admin_name" value="${z.admin_name||''}" required></div>
      <div class="field"><span class="label">Базовая доставка</span><input class="input" type="number" name="base_price" value="${z.base_price||0}" required></div>
      <div class="field full"><span class="label">GeoJSON Polygon / MultiPolygon</span><textarea class="textarea" name="geojson" required>${z.geojson||'{\n  "type": "Polygon",\n  "coordinates": []\n}'}</textarea></div>
    </div>`;
}

async function saveZone(e){
  e.preventDefault(); const form = e.target; const id = form.dataset.id; const payload = Object.fromEntries(new FormData(form).entries()); payload.base_price = Number(payload.base_price);
  if(id) await adminApi(`/zones/${id}`, { method:'PUT', body: JSON.stringify(payload) }); else await adminApi('/zones', { method:'POST', body: JSON.stringify(payload) });
  qs('#zoneModal').classList.remove('show'); await loadAdmin();
}

async function saveRule(e){
  e.preventDefault(); const payload = Object.fromEntries(new FormData(e.target).entries()); payload.zone_id = Number(payload.zone_id); payload.min_order_sum = Number(payload.min_order_sum); payload.delivery_price = Number(payload.delivery_price);
  await adminApi('/rules', { method:'POST', body: JSON.stringify(payload) }); e.target.reset(); await loadAdmin();
}

// call center
async function loadCallCenter(){
  const password = localStorage.getItem('mantrova_admin_token');
  if (!password) return;
  const data = await adminApi('/orders');
  window.__orders = data.orders;
  renderOrders();
}

function renderOrders(){
  const q = (qs('#orderSearch')?.value || '').trim().toLowerCase();
  const tbody = qs('#ordersTable'); if (!tbody || !window.__orders) return;
  tbody.innerHTML = window.__orders.filter(o => !q || `${o.order_number} ${o.customer_name} ${o.phone} ${o.address_text}`.toLowerCase().includes(q)).map(o => `
    <tr>
      <td><strong>#${o.order_number}</strong><div class="muted">${o.created_at}</div></td>
      <td>${o.customer_name}<div class="muted">${o.phone}</div></td>
      <td>${o.address_text}<div class="muted">${o.contact_type||''}: ${o.contact_value||''}</div></td>
      <td>${rub(o.total)}</td>
      <td><select class="select" data-status="${o.id}">${['new','waiting_payment','production','delivery','done'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></td>
      <td><textarea class="textarea" data-note="${o.id}" style="min-height:74px">${o.operator_note||''}</textarea></td>
      <td><button class="btn-soft" data-save-order="${o.id}">Сохранить</button></td>
    </tr>`).join('');
  qsa('[data-save-order]').forEach(b => b.onclick = async () => {
    const id = b.dataset.saveOrder; const status = qs(`[data-status="${id}"]`).value; const operator_note = qs(`[data-note="${id}"]`).value;
    await adminApi(`/orders/${id}`, { method:'PUT', body: JSON.stringify({ status, operator_note }) }); await loadCallCenter();
  });
}
function statusLabel(s){ return ({new:'Новый',waiting_payment:'Ожидает оплаты',production:'На производстве',delivery:'В доставке',done:'Выполнен'})[s] || s; }

window.addEventListener('DOMContentLoaded', () => {
  qs('#openCart')?.addEventListener('click', openCart);
  qs('#closeCart')?.addEventListener('click', closeCart);
  qs('#overlay')?.addEventListener('click', closeCart);
  qs('#checkoutForm')?.addEventListener('submit', handleCheckout);
  qs('#adminLoginForm')?.addEventListener('submit', handleAdminLogin);
  qs('#appearanceForm')?.addEventListener('submit', saveAppearance);
  qs('#productForm')?.addEventListener('submit', saveProduct);
  qs('#zoneForm')?.addEventListener('submit', saveZone);
  qs('#ruleForm')?.addEventListener('submit', saveRule);
  qs('#newProductBtn')?.addEventListener('click', () => openProductModal());
  qs('#newZoneBtn')?.addEventListener('click', () => openZoneModal());
  qsa('.menu button').forEach(b => b.onclick = () => switchAdminSection(b.dataset.section));
  qsa('[data-close-modal]').forEach(b => b.onclick = () => qs(b.dataset.closeModal).classList.remove('show'));
  qs('#orderSearch')?.addEventListener('input', renderOrders);

  if (document.body.dataset.page === 'storefront') initStorefront();
  if (document.body.dataset.page === 'admin') adminState.token ? (qs('#loginBox').classList.add('hidden'), qs('#adminApp').classList.remove('hidden'), loadAdmin().catch(()=>{})) : null;
  if (document.body.dataset.page === 'callcenter') loadCallCenter().catch(console.error);
});
