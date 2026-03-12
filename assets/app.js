const DATA_BASE = '../data';
const STORE_DATA_BASE = './data';
const WORKER_BASE = window.MS_WORKER_BASE || 'https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev';

const state = {
  cart: JSON.parse(localStorage.getItem('mantrova_cart') || '[]'),
  site: null,
  products: [],
  zones: null,
  adminToken: localStorage.getItem('mantrova_admin_token') || '',
  orders: []
};

const qs = (s, root = document) => root.querySelector(s);
const qsa = (s, root = document) => [...root.querySelectorAll(s)];
const rub = n => new Intl.NumberFormat('ru-RU').format(Number(n || 0)) + ' ₽';
const page = document.body.dataset.page;

const fetchJson = async url => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить ' + url);
  return res.json();
};

const api = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.adminToken) headers['x-admin-token'] = state.adminToken;
  const res = await fetch(WORKER_BASE + path, { ...options, headers });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof data === 'string' ? data : data.error || 'Ошибка запроса');
  return data;
};

function saveCart(){ localStorage.setItem('mantrova_cart', JSON.stringify(state.cart)); }
function toast(msg){ alert(msg); }
function syncCart(){ qsa('[data-cart-count]').forEach(el => el.textContent = state.cart.reduce((a, i) => a + i.qty, 0)); }
function cartSubtotal(){ return state.cart.reduce((a, i) => a + i.qty * i.price, 0); }

function makeBannerSvg(accent1 = '#ffd8e6', accent2 = '#f4a7c1'){
  return `<svg viewBox="0 0 600 340" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="340" rx="34" fill="url(#g)"/><circle cx="520" cy="70" r="120" fill="#fff" fill-opacity=".28"/><circle cx="120" cy="300" r="110" fill="#fff" fill-opacity=".16"/><path d="M0 250C80 180 160 240 250 230C370 217 424 120 600 160V340H0V250Z" fill="#fff" fill-opacity=".38"/><defs><linearGradient id="g" x1="0" y1="0" x2="600" y2="340"><stop stop-color="${accent1}"/><stop offset="1" stop-color="${accent2}"/></linearGradient></defs></svg>`;
}

function openCart(){ qs('#cartDrawer')?.classList.add('open'); qs('#overlay')?.classList.add('show'); renderCart(); }
function closeCart(){ qs('#cartDrawer')?.classList.remove('open'); qs('#overlay')?.classList.remove('show'); }

function addToCart(product, option = null){
  const suffix = option?.name ? ` — ${option.name}` : '';
  const key = `${product.id}:${option?.name || 'base'}`;
  const found = state.cart.find(x => x.key === key);
  const item = {
    key,
    product_id: product.id,
    name: product.name + suffix,
    price: Number(option?.price || product.price),
    image: product.image,
    qty: 1
  };
  if (found) found.qty += 1; else state.cart.push(item);
  saveCart();
  syncCart();
  renderCart();
  toast('Товар добавлен в корзину');
}

function updateQty(key, delta){
  const item = state.cart.find(x => x.key === key);
  if (!item) return;
  item.qty += delta;
  state.cart = state.cart.filter(x => x.qty > 0);
  saveCart();
  syncCart();
  renderCart();
}

function renderStore(){
  const s = state.site;
  qs('#siteName').textContent = s.site_name;
  qs('#heroTitle').textContent = s.hero_title;
  qs('#heroText').textContent = s.hero_text;
  qs('#founderPhoto').src = s.founder_photo;
  qs('#founderName').textContent = s.founder_name;
  qs('#founderText').textContent = s.founder_text;
  qs('#aboutText').textContent = s.about_text;
  qs('#contactTitle').textContent = s.site_name;
  qs('#contactText').textContent = s.contact_text;
  qs('#footerBrand').textContent = s.site_name;
  qs('#footerText').textContent = s.footer_text;
  qs('#heroFacts').innerHTML = (s.hero_facts || []).map(t => `<span class="fact-chip">${t}</span>`).join('');
  qs('#aboutList').innerHTML = (s.about_list || []).map(t => `<li>${t}</li>`).join('');
  qs('#socials').innerHTML = [
    ['VK', s.vk_url], ['Telegram', s.telegram_url], ['Max', s.max_url], ['RuStore', s.rustore_url]
  ].filter(x => x[1]).map(([name, url]) => `<a class="social" href="${url}" target="_blank" rel="noreferrer">${name}</a>`).join('');
  qs('#bannerGrid').innerHTML = (s.banners || []).map(b => `
    <article class="panel banner">
      ${makeBannerSvg(b.accent1, b.accent2)}
      <div class="banner-content"><h3>${b.title}</h3><p>${b.text || ''}</p></div>
    </article>`).join('');
  const cats = ['all', ...new Set(state.products.map(p => p.category))];
  qs('#categoryPills').innerHTML = cats.map((c, i) => `<button class="pill ${i===0?'active':''}" data-cat="${c}">${c === 'all' ? 'Все товары' : c}</button>`).join('');
  let current = 'all';
  const renderProducts = () => {
    const items = state.products.filter(p => p.active !== false && (current === 'all' || p.category === current));
    qs('#productGrid').innerHTML = items.map(p => `
      <article class="panel card">
        <div class="card-media">${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">` : '<div style="font-size:48px">🎁</div>'}</div>
        <div class="card-body">
          <h3 class="card-title">${p.name}</h3>
          <div class="card-desc">${p.description || ''}</div>
          <div class="meta">${(p.badges || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="price-row">
            <div class="price">от ${rub(p.price)}</div>
            <button class="btn" data-add="${p.id}">В корзину</button>
          </div>
        </div>
      </article>`).join('');
    qsa('[data-add]').forEach(btn => btn.onclick = () => {
      const product = state.products.find(x => x.id === btn.dataset.add);
      const opt = Array.isArray(product.options) && product.options.length ? product.options[0] : null;
      addToCart(product, opt);
    });
  };
  renderProducts();
  qsa('[data-cat]').forEach(btn => btn.onclick = () => {
    current = btn.dataset.cat;
    qsa('[data-cat]').forEach(b => b.classList.toggle('active', b === btn));
    renderProducts();
  });
  renderDeliveryRules();
  qs('#openCartBtn').onclick = openCart;
  qs('#closeCartBtn').onclick = closeCart;
  qs('#overlay').onclick = closeCart;
  qs('#checkoutForm').onsubmit = submitOrder;
  renderCart();
  syncCart();
}

function renderDeliveryRules(){
  const rules = state.site.delivery_rules || [];
  const grouped = {};
  rules.forEach(r => {
    const key = r.zone || 'Без зоны';
    grouped[key] ||= [];
    grouped[key].push(r);
  });
  qs('#deliveryRules').innerHTML = Object.entries(grouped).map(([zone, items]) => `
    <div class="panel-soft" style="margin-bottom:12px">
      <strong>${zone}</strong>
      <ul class="clean-list">${items.map(i => `<li>от ${rub(i.min_order_sum)} — доставка ${rub(i.delivery_price)}</li>`).join('')}</ul>
    </div>`).join('');
}

function renderCart(){
  const wrap = qs('#cartItems');
  if (!wrap) return;
  if (!state.cart.length) {
    wrap.innerHTML = '<div class="panel-soft">Корзина пока пустая.</div>';
    qs('#cartSubtotal').textContent = rub(0);
    qs('#cartTotal').textContent = rub(0);
    return;
  }
  wrap.innerHTML = state.cart.map(i => `
    <div class="cart-item">
      ${i.image ? `<img src="${i.image}" alt="${i.name}">` : '<div class="card-media" style="height:72px;border-radius:14px">🎁</div>'}
      <div>
        <strong>${i.name}</strong>
        <div class="muted">${rub(i.price)}</div>
      </div>
      <div class="qty">
        <button data-qty="${i.key}" data-delta="-1">−</button>
        <strong>${i.qty}</strong>
        <button data-qty="${i.key}" data-delta="1">+</button>
      </div>
    </div>`).join('');
  qsa('[data-qty]').forEach(btn => btn.onclick = () => updateQty(btn.dataset.qty, Number(btn.dataset.delta)));
  qs('#cartSubtotal').textContent = rub(cartSubtotal());
  qs('#cartTotal').textContent = rub(cartSubtotal());
}

function detectZoneByText(address){
  const zoneMap = state.site.address_zone_keywords || [];
  const lower = address.toLowerCase();
  return zoneMap.find(z => (z.keywords || []).some(k => lower.includes(k.toLowerCase())))?.zone || null;
}

function computeDelivery(subtotal, address){
  const zone = detectZoneByText(address) || 'Основная зона';
  const items = (state.site.delivery_rules || []).filter(r => r.zone === zone);
  let price = 0;
  for (const r of items) if (subtotal >= Number(r.min_order_sum)) price = Number(r.delivery_price);
  return { zone, delivery_price: price };
}

async function submitOrder(e){
  e.preventDefault();
  if (!state.cart.length) return toast('Корзина пустая');
  const fd = new FormData(e.target);
  const subtotal = cartSubtotal();
  const address = String(fd.get('address_text') || '');
  const delivery = computeDelivery(subtotal, address);
  const payload = {
    customer_name: fd.get('customer_name'),
    phone: fd.get('phone'),
    contact_type: fd.get('contact_type'),
    contact_value: fd.get('contact_value'),
    address_text: address,
    comment: fd.get('comment'),
    zone: delivery.zone,
    delivery_price: delivery.delivery_price,
    subtotal,
    total: subtotal + delivery.delivery_price,
    items: state.cart
  };
  try {
    const res = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
    toast(`Заказ №${res.order_number} отправлен`);
    state.cart = [];
    saveCart();
    syncCart();
    e.target.reset();
    renderCart();
    closeCart();
  } catch (err) {
    toast(err.message);
  }
}

async function initStore(){
  state.site = await fetchJson(STORE_DATA_BASE + '/site.json');
  state.products = await fetchJson(STORE_DATA_BASE + '/products.json');
  try { state.zones = await fetchJson(STORE_DATA_BASE + '/zones.geojson'); } catch {}
  renderStore();
}

function bindAdminTabs(){
  qsa('.side-btn').forEach(btn => btn.onclick = () => {
    qsa('.side-btn').forEach(x => x.classList.toggle('active', x === btn));
    qsa('.tab-panel').forEach(panel => panel.classList.toggle('hidden', panel.dataset.tabPanel !== btn.dataset.tab));
  });
}

function fillAdmin(data){
  const s = data.site;
  const set = (id, val) => { const el = qs('#' + id); if (el) el.value = val ?? ''; };
  set('s_site_name', s.site_name);
  set('s_site_tagline', s.site_tagline);
  set('s_hero_title', s.hero_title);
  set('s_founder_name', s.founder_name);
  set('s_founder_photo', s.founder_photo);
  set('s_founder_text', s.founder_text);
  set('s_hero_text', s.hero_text);
  set('s_about_text', s.about_text);
  set('s_about_list', (s.about_list || []).join('\n'));
  set('s_vk_url', s.vk_url);
  set('s_telegram_url', s.telegram_url);
  set('s_max_url', s.max_url);
  set('s_rustore_url', s.rustore_url);
  set('s_footer_text', s.footer_text);
  set('s_hero_facts', (s.hero_facts || []).join('\n'));
  set('banners_json', JSON.stringify(s.banners || [], null, 2));
  set('zones_json', JSON.stringify(data.zones || { type: 'FeatureCollection', features: [] }, null, 2));
  set('delivery_rules_json', JSON.stringify(s.delivery_rules || [], null, 2));
  renderProductEditors(data.products || []);
}

function renderProductEditors(products){
  const wrap = qs('#productsAdminList');
  wrap.innerHTML = '';
  products.forEach(p => wrap.appendChild(productEditorNode(p)));
}

function productEditorNode(product){
  const node = qs('#productEditorTpl').content.firstElementChild.cloneNode(true);
  qs('.p-title', node).textContent = product.name || 'Новый товар';
  qsa('[data-k]', node).forEach(el => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') el.checked = product[k] !== false;
    else if (k === 'options') el.value = JSON.stringify(product[k] || [], null, 2);
    else if (k === 'badges') el.value = Array.isArray(product[k]) ? product[k].join(', ') : '';
    else el.value = product[k] ?? '';
    el.oninput = () => {
      if (k === 'name') qs('.p-title', node).textContent = el.value || 'Новый товар';
    };
  });
  qs('.p-remove', node).onclick = () => node.remove();
  return node;
}

function collectAdminData(){
  const site = {
    site_name: qs('#s_site_name').value.trim(),
    site_tagline: qs('#s_site_tagline').value.trim(),
    hero_title: qs('#s_hero_title').value.trim(),
    hero_text: qs('#s_hero_text').value.trim(),
    founder_name: qs('#s_founder_name').value.trim(),
    founder_photo: qs('#s_founder_photo').value.trim(),
    founder_text: qs('#s_founder_text').value.trim(),
    about_text: qs('#s_about_text').value.trim(),
    about_list: qs('#s_about_list').value.split('\n').map(x => x.trim()).filter(Boolean),
    contact_text: 'Напишите нам удобным способом — поможем подобрать подарок и оформить заказ.',
    vk_url: qs('#s_vk_url').value.trim(),
    telegram_url: qs('#s_telegram_url').value.trim(),
    max_url: qs('#s_max_url').value.trim(),
    rustore_url: qs('#s_rustore_url').value.trim(),
    footer_text: qs('#s_footer_text').value.trim(),
    hero_facts: qs('#s_hero_facts').value.split('\n').map(x => x.trim()).filter(Boolean),
    banners: JSON.parse(qs('#banners_json').value || '[]'),
    delivery_rules: JSON.parse(qs('#delivery_rules_json').value || '[]'),
    address_zone_keywords: state.site.address_zone_keywords || []
  };
  const products = qsa('.admin-item').map(node => {
    const obj = {};
    qsa('[data-k]', node).forEach(el => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') obj[k] = el.checked;
      else if (k === 'badges') obj[k] = el.value.split(',').map(x => x.trim()).filter(Boolean);
      else if (k === 'options') obj[k] = JSON.parse(el.value || '[]');
      else if (k === 'price') obj[k] = Number(el.value || 0);
      else obj[k] = el.value.trim();
    });
    return obj;
  });
  const zones = JSON.parse(qs('#zones_json').value || '{"type":"FeatureCollection","features":[]}');
  return { site, products, zones };
}

async function initAdmin(){
  bindAdminTabs();
  qs('#addProductBtn').onclick = () => qs('#productsAdminList').appendChild(productEditorNode({ active: true, options: [] }));
  qs('#adminLoginForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const fd = new FormData(e.target);
      const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: fd.get('password') }) });
      state.adminToken = data.token;
      localStorage.setItem('mantrova_admin_token', data.token);
      qs('#adminLoginBox').classList.add('hidden');
      qs('#adminApp').classList.remove('hidden');
      const boot = await api('/api/admin/bootstrap');
      state.site = boot.site;
      fillAdmin(boot);
    } catch (err) { toast(err.message); }
  };
  qs('#saveAllBtn').onclick = async () => {
    try {
      const payload = collectAdminData();
      await api('/api/admin/save-all', { method: 'POST', body: JSON.stringify(payload) });
      state.site = payload.site;
      toast('Изменения сохранены в GitHub');
    } catch (err) {
      toast('Ошибка сохранения: ' + err.message);
    }
  };
  if (state.adminToken) {
    try {
      const boot = await api('/api/admin/bootstrap');
      state.site = boot.site;
      qs('#adminLoginBox').classList.add('hidden');
      qs('#adminApp').classList.remove('hidden');
      fillAdmin(boot);
    } catch {
      localStorage.removeItem('mantrova_admin_token');
      state.adminToken = '';
    }
  }
}

function orderCard(order){
  return `
    <article class="order-card">
      <div class="order-head">
        <div>
          <div class="status">${order.status || 'new'}</div>
          <h3 style="margin:8px 0 0">Заказ №${order.order_number}</h3>
        </div>
        <div class="muted">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
      </div>
      <div class="order-grid">
        <div><small>Имя</small><strong>${order.customer_name}</strong></div>
        <div><small>Телефон</small><strong>${order.phone}</strong></div>
        <div><small>Контакт</small><strong>${order.contact_type}: ${order.contact_value || '—'}</strong></div>
        <div><small>Адрес</small><strong>${order.address_text}</strong></div>
        <div><small>Зона</small><strong>${order.zone || '—'}</strong></div>
        <div><small>Сумма</small><strong>${rub(order.total)}</strong></div>
      </div>
      <div><small class="muted">Состав заказа</small><div class="muted">${(order.items || []).map(i => `${i.name} × ${i.qty}`).join(', ')}</div></div>
      <div style="margin-top:10px"><small class="muted">Комментарий клиента</small><div>${order.comment || '—'}</div></div>
      <div class="status-row">
        <select data-status="${order.id}">
          ${['new','awaiting_payment','in_production','delivery','done','cancelled'].map(s => `<option value="${s}" ${order.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <input data-note="${order.id}" value="${order.operator_note || ''}" placeholder="Заметка оператора">
        <button class="btn btn-light" data-save-order="${order.id}">Сохранить</button>
      </div>
    </article>`;
}

async function loadOrders(){
  const data = await api('/api/admin/orders');
  state.orders = data.orders || [];
  renderOrders();
}

function renderOrders(){
  const term = (qs('#orderSearch')?.value || '').toLowerCase().trim();
  const items = state.orders.filter(o => !term || JSON.stringify(o).toLowerCase().includes(term));
  qs('#ordersList').innerHTML = items.length ? items.map(orderCard).join('') : '<div class="panel-soft">Заказы не найдены.</div>';
  qsa('[data-save-order]').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.saveOrder;
    const status = qs(`[data-status="${id}"]`).value;
    const operator_note = qs(`[data-note="${id}"]`).value;
    try {
      await api(`/api/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status, operator_note }) });
      await loadOrders();
      toast('Заказ обновлён');
    } catch (err) { toast(err.message); }
  });
}

async function initCallCenter(){
  const login = async password => {
    const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    state.adminToken = data.token;
    localStorage.setItem('mantrova_admin_token', data.token);
    qs('#ccLoginBox').classList.add('hidden');
    qs('#ccApp').classList.remove('hidden');
    await loadOrders();
  };
  qs('#ccLoginForm').onsubmit = async e => {
    e.preventDefault();
    try { await login(new FormData(e.target).get('password')); } catch (err) { toast(err.message); }
  };
  qs('#orderSearch').oninput = renderOrders;
  qs('#refreshOrdersBtn').onclick = loadOrders;
  if (state.adminToken) {
    try {
      qs('#ccLoginBox').classList.add('hidden');
      qs('#ccApp').classList.remove('hidden');
      await loadOrders();
    } catch {
      localStorage.removeItem('mantrova_admin_token');
      state.adminToken = '';
    }
  }
}

(async function main(){
  try {
    if (page === 'store') await initStore();
    if (page === 'admin') await initAdmin();
    if (page === 'callcenter') await initCallCenter();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
})();
