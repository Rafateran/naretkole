/* NARETKOLE — Capa de datos (async)
   Dos modos automáticos:
     • REAL  → si config.js tiene claves válidas de Supabase (compartido, en la nube)
     • DEMO  → si no, usa localStorage (solo este navegador)
   La API es la misma en ambos modos. Las funciones de datos son async
   (devuelven promesas); currentUser()/isAdmin()/carrito son síncronas. */
(function(global){
  'use strict';

  var CFG = global.NK_CONFIG || {};
  var CONFIGURED = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY &&
                   CFG.SUPABASE_URL.indexOf('PEGA_') !== 0 &&
                   CFG.SUPABASE_ANON_KEY.indexOf('PEGA_') !== 0;

  var sb = null;
  if(CONFIGURED && global.supabase && global.supabase.createClient){
    sb = global.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  } else {
    CONFIGURED = false; // sin librería o sin claves → demo
  }

  var CATEGORIES = [
    { id:'trajes',  nombre:'Trajes' },
    { id:'quillas', nombre:'Quillas y Coronas' },
    { id:'mazos',   nombre:'Mazos y Collares' }
  ];
  var CATN = { trajes:'Trajes', quillas:'Quillas y Coronas', mazos:'Mazos y Collares' };

  /* =========================================================
     Utilidades comunes
     ========================================================= */
  function read(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
  function write(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
  function money(n){ return '$' + Number(n||0).toLocaleString('es'); }
  function productImages(product){
    var raw = product && typeof product==='object'
      ? (product.imagenes || product.images || product.img)
      : product;
    if(Array.isArray(raw)){
      return raw.filter(function(x){ return typeof x==='string' && x.trim(); });
    }
    if(typeof raw!=='string' || !raw.trim()) return [];
    var value = raw.trim();
    if(value.charAt(0)==='['){
      try{
        var parsed = JSON.parse(value);
        if(Array.isArray(parsed)) return parsed.filter(function(x){ return typeof x==='string' && x.trim(); });
      }catch(e){}
    }
    return [value];
  }
  function packedImages(product){
    var images = productImages(product);
    if(!images.length) images = ['assets/strip-bg.svg'];
    return images.length===1 ? images[0] : JSON.stringify(images);
  }

  var _user = null;     // { id, email, nombre, rol }
  var _initPromise = null;

  /* ---- Carrito (siempre local; es por-navegador como en toda tienda) ---- */
  var CKEY = 'nk_cart';
  function getCart(){ return read(CKEY, []); }                 // [{id,nombre,precio,img,qty}]
  function addToCart(prod, qty){
    qty = qty||1; var cart = getCart();
    var it = cart.filter(function(x){ return x.id===prod.id; })[0];
    if(it){ it.qty += qty; }
    else { cart.push({ id:prod.id, nombre:prod.nombre, precio:prod.precio, img:productImages(prod)[0]||'assets/strip-bg.svg', qty:qty }); }
    write(CKEY, cart); return cartCount();
  }
  function setQty(id,qty){ write(CKEY, getCart().map(function(x){ return x.id===id?Object.assign(x,{qty:Math.max(1,qty)}):x; })); }
  function removeFromCart(id){ write(CKEY, getCart().filter(function(x){ return x.id!==id; })); }
  function clearCart(){ localStorage.removeItem(CKEY); }
  function cartDetailed(){ return getCart().map(function(x){ return Object.assign({ subtotal:x.precio*x.qty }, x); }); }
  function cartCount(){ return getCart().reduce(function(s,x){ return s+x.qty; },0); }
  function cartTotal(){ return getCart().reduce(function(s,x){ return s+x.precio*x.qty; },0); }

  function currentUser(){ return _user; }
  function isAdmin(){ return !!_user && _user.rol==='admin'; }

  /* =========================================================
     MODO REAL (Supabase)
     ========================================================= */
  var SB = {
    init: async function(){
      var s = await sb.auth.getSession();
      var u = s.data.session && s.data.session.user;
      if(u){ await SB._loadProfile(u); }
      sb.auth.onAuthStateChange(function(_e, sess){
        if(!sess){ _user = null; }
      });
    },
    _loadProfile: async function(u){
      var r = await sb.from('profiles').select('nombre,rol').eq('id', u.id).single();
      _user = { id:u.id, email:u.email, nombre:(r.data&&r.data.nombre)||u.email.split('@')[0], rol:(r.data&&r.data.rol)||'cliente' };
    },
    register: async function(nombre, email, pass){
      var r = await sb.auth.signUp({ email:email, password:pass, options:{ data:{ nombre:nombre } } });
      if(r.error) return { error: traducir(r.error.message) };
      if(r.data.session){ await SB._loadProfile(r.data.user); return { user:_user }; }
      // Si la confirmación por correo está activa, no hay sesión inmediata:
      return { info:'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.' };
    },
    login: async function(email, pass){
      var r = await sb.auth.signInWithPassword({ email:email, password:pass });
      if(r.error) return { error: traducir(r.error.message) };
      await SB._loadProfile(r.data.user); return { user:_user };
    },
    logout: async function(){ await sb.auth.signOut(); _user = null; },
    getProducts: async function(){
      var r = await sb.from('products').select('*').order('created_at',{ascending:true});
      return r.data || [];
    },
    getActiveProducts: async function(){
      var r = await sb.from('products').select('*').eq('activo',true).order('created_at',{ascending:true});
      return r.data || [];
    },
    getProduct: async function(id){
      var r = await sb.from('products').select('*').eq('id',id).single(); return r.data;
    },
    saveProduct: async function(p){
      var row = { nombre:p.nombre, categoria:p.categoria, orisha:p.orisha, precio:p.precio, descripcion:p.descripcion, img:packedImages(p) };
      if(p.activo!==undefined) row.activo = p.activo;
      if(p.id){ var r = await sb.from('products').update(row).eq('id',p.id).select().single(); return r.data; }
      var r2 = await sb.from('products').insert(row).select().single(); return r2.data;
    },
    deleteProduct: async function(id){ await sb.from('products').delete().eq('id',id); },
    uploadImage: async function(dataUrl){
      var blob = dataURLtoBlob(dataUrl);
      var name = 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) + '.jpg';
      var up = await sb.storage.from(CFG.STORAGE_BUCKET).upload(name, blob, { contentType:'image/jpeg', upsert:false });
      if(up.error){ console.warn(up.error); return dataUrl; }
      var pub = sb.storage.from(CFG.STORAGE_BUCKET).getPublicUrl(name);
      return pub.data.publicUrl;
    },
    createOrder: async function(datos){
      var order = { user_id:_user?_user.id:null, email:(_user&&_user.email)||(datos&&datos.email)||'',
                    items:cartDetailed(), total:cartTotal(), envio:datos||{}, estado:'pendiente_pago' };
      var r = await sb.from('orders').insert(order).select().single();
      return r.data || Object.assign({ id:'(local)', fecha:new Date().toISOString() }, order);
    },
    getOrders: async function(){
      var r = await sb.from('orders').select('*').order('created_at',{ascending:false}); return r.data || [];
    },
    ordersForUser: async function(id){
      var r = await sb.from('orders').select('*').eq('user_id',id).order('created_at',{ascending:false}); return r.data || [];
    }
  };

  function traducir(msg){
    if(/already registered|already exists/i.test(msg)) return 'Ese correo ya está registrado.';
    if(/Invalid login/i.test(msg)) return 'Correo o contraseña incorrectos.';
    if(/at least/i.test(msg)) return 'La contraseña es muy corta.';
    return msg;
  }
  function dataURLtoBlob(dataUrl){
    var parts = dataUrl.split(','), mime = (parts[0].match(/:(.*?);/)||[])[1]||'image/jpeg';
    var bin = atob(parts[1]), n = bin.length, arr = new Uint8Array(n);
    while(n--) arr[n] = bin.charCodeAt(n);
    return new Blob([arr], { type:mime });
  }

  /* =========================================================
     MODO DEMO (localStorage)
     ========================================================= */
  var SEED = [
    { id:'p01', nombre:'Traje Real Índigo',   categoria:'trajes', orisha:'Yemayá', precio:285, descripcion:'Satén azul índigo, encaje plateado y pedrería azul.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_04.png', activo:true },
    { id:'p02', nombre:'Conjunto Niño Azul',   categoria:'trajes', orisha:'Niño',   precio:180, descripcion:'Chaqueta azul con pedrería y tutú multicolor.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_10.png', activo:true },
    { id:'p03', nombre:'Guerrero Rojo Rafia',  categoria:'trajes', orisha:'Changó', precio:330, descripcion:'Chaqueta roja tigre, cauríes, faldón de rafia y gorro.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_16.png', activo:true },
    { id:'p04', nombre:'Vestido Dorado Ochún', categoria:'trajes', orisha:'Ochún', precio:310, descripcion:'Dorado con bordado floral, gorro y pañuelo a juego.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_24.png', activo:true },
    { id:'p05', nombre:'Príncipe Blanco',      categoria:'trajes', orisha:'Obatalá', precio:240, descripcion:'Traje perlado con pantalón bombacho, gorro y corona.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_31.png', activo:true },
    { id:'p06', nombre:'Conjunto Azul Corona', categoria:'trajes', orisha:'Yemayá', precio:220, descripcion:'Chaqueta azul, tutú de organza y corona a juego.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_36.png', activo:true },
    { id:'p07', nombre:'Guerrero Tigre Rojo',  categoria:'trajes', orisha:'Changó', precio:340, descripcion:'Rojo, blanco y dorado con cauríes y boina a juego.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_40.png', activo:true },
    { id:'p08', nombre:'Mono Rafia Verde',     categoria:'trajes', orisha:'Osain',  precio:260, descripcion:'Rafia natural, detalles verdes, cauríes y sombrero.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_43.png', activo:true },
    { id:'p09', nombre:'Blanco Arcoíris',      categoria:'trajes', orisha:'Obatalá', precio:295, descripcion:'Blanco brocado con faldas de organza multicolor.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_46.png', activo:true },
    { id:'p10', nombre:'Blusa Negra Cauríes',  categoria:'trajes', orisha:'Osain',  precio:145, descripcion:'Blusa negra con verde y sombrero de cauríes.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_49.png', activo:true },
    { id:'p11', nombre:'Vino Arcoíris',        categoria:'trajes', orisha:'Oyá',    precio:300, descripcion:'Vino borgoña con gorro y caídas de organza de colores.', img:'ChatGPT%20Image%2019%20jul%202026%2C%2013_18_53.png', activo:true },
    { id:'m1', nombre:'Mazo Multicolor de la Nación', categoria:'mazos', orisha:'Protección', precio:65, descripcion:'Pulsera plana tejida en verde y dorado con cuentas rojas, negras y blancas.', img:'mazos/mazo%201.png', activo:true },
    { id:'m2', nombre:'Mazo de Orula',           categoria:'mazos', orisha:'Orula',      precio:60, descripcion:'Pulsera plana en verde y amarillo, los colores de Orula.', img:'mazos/mazo2.png', activo:true },
    { id:'m3', nombre:'Mazo Ámbar de Cristal',   categoria:'mazos', orisha:'Oshún',      precio:55, descripcion:'Racimo de cristales ámbar, miel y perlas doradas.', img:'mazos/mazo%203.png', activo:true },
    { id:'m4', nombre:'Mazo Blanco de Obatalá',  categoria:'mazos', orisha:'Obatalá',    precio:58, descripcion:'Racimo de cristales y cuentas blancas nacaradas.', img:'mazos/mazo%204.png', activo:true },
    { id:'m5', nombre:'Mazo Ojo Protector Azul', categoria:'mazos', orisha:'Protección', precio:62, descripcion:'Cuentas azules y cristal con ojitos de protección.', img:'mazos/mazo%205.png', activo:true },
    { id:'m6', nombre:'Mazo Esmeralda',          categoria:'mazos', orisha:'Osain',      precio:60, descripcion:'Racimos verdes con centro de cuentas negras, rojas y blancas.', img:'mazos/mazo%206.png', activo:true },
    { id:'m7', nombre:'Mazo Verde Noche',        categoria:'mazos', orisha:'Osain',      precio:64, descripcion:'Racimos de cristal verde oscuro con broches plateados.', img:'mazos/mazo%207.png', activo:true },
    { id:'m8', nombre:'Mazo de Cauríes y Rafia', categoria:'mazos', orisha:'Osain',      precio:70, descripcion:'Puño de rafia natural con cauríes y cuentas verdes y negras.', img:'mazos/mazo%208.png', activo:true }
  ];
  var SEED_VERSION = 2; // súbelo si agregas productos a SEED para que aparezcan en navegadores existentes
  function uid(p){ return (p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  var DK = { products:'nk_products', users:'nk_users', session:'nk_session', orders:'nk_orders' };

  var LOCAL = {
    init: async function(){
      if(!localStorage.getItem(DK.products)){
        write(DK.products, SEED);
      } else {
        // Agrega productos nuevos de SEED (por id) sin borrar tus ediciones
        var v = parseInt(localStorage.getItem('nk_seed_v')||'1', 10);
        if(v < SEED_VERSION){
          var list = read(DK.products, []);
          var ids = {}; list.forEach(function(p){ ids[p.id] = 1; });
          SEED.forEach(function(s){ if(!ids[s.id]) list.push(s); });
          write(DK.products, list);
        }
      }
      localStorage.setItem('nk_seed_v', String(SEED_VERSION));
      if(!localStorage.getItem(DK.users)) write(DK.users, [{ id:uid('u'), nombre:'Administrador', email:(CFG.ADMIN_EMAIL||'admin@naretkole.com'), pass:'admin123', rol:'admin' }]);
      _user = read(DK.session, null);
    },
    register: async function(nombre,email,pass){
      email=(email||'').toLowerCase().trim(); var users=read(DK.users,[]);
      if(users.some(function(u){return u.email===email;})) return { error:'Ese correo ya está registrado.' };
      var u={ id:uid('u'), nombre:nombre||email.split('@')[0], email:email, pass:pass, rol:'cliente' };
      users.push(u); write(DK.users,users); _user={id:u.id,email:u.email,nombre:u.nombre,rol:u.rol}; write(DK.session,_user);
      return { user:_user };
    },
    login: async function(email,pass){
      email=(email||'').toLowerCase().trim();
      var u=read(DK.users,[]).filter(function(x){return x.email===email&&x.pass===pass;})[0];
      if(!u) return { error:'Correo o contraseña incorrectos.' };
      _user={id:u.id,email:u.email,nombre:u.nombre,rol:u.rol}; write(DK.session,_user); return { user:_user };
    },
    logout: async function(){ localStorage.removeItem(DK.session); _user=null; },
    getProducts: async function(){ return read(DK.products,[]); },
    getActiveProducts: async function(){ return read(DK.products,[]).filter(function(p){return p.activo!==false;}); },
    getProduct: async function(id){ return read(DK.products,[]).filter(function(p){return p.id===id;})[0]; },
    saveProduct: async function(p){
      var list=read(DK.products,[]);
      var images=productImages(p); if(!images.length) images=['assets/strip-bg.svg'];
      p.imagenes=images; p.img=images[0];
      if(p.id){ var i=list.findIndex(function(x){return x.id===p.id;}); if(i>=0) list[i]=Object.assign(list[i],p); else list.push(p); }
      else { p.id=uid('p'); if(p.activo===undefined)p.activo=true; list.push(p); }
      write(DK.products,list); return p;
    },
    deleteProduct: async function(id){ write(DK.products, read(DK.products,[]).filter(function(p){return p.id!==id;})); },
    uploadImage: async function(dataUrl){ return dataUrl; }, // en demo, se guarda el dataURL tal cual
    createOrder: async function(datos){
      var o={ id:'NK-'+Date.now().toString(36).toUpperCase(), fecha:new Date().toISOString(), created_at:new Date().toISOString(),
              user_id:_user?_user.id:null, email:(_user&&_user.email)||(datos&&datos.email)||'',
              items:cartDetailed(), total:cartTotal(), envio:datos||{}, estado:'pendiente_pago' };
      var list=read(DK.orders,[]); list.push(o); write(DK.orders,list); return o;
    },
    getOrders: async function(){ return read(DK.orders,[]).slice().reverse(); },
    ordersForUser: async function(id){ return read(DK.orders,[]).filter(function(o){return o.user_id===id;}).reverse(); }
  };

  var A = CONFIGURED ? SB : LOCAL;

  function init(){ if(!_initPromise){ _initPromise = A.init().catch(function(e){ console.warn('init',e); }); } return _initPromise; }

  global.NK = {
    MODE: CONFIGURED ? 'real' : 'demo',
    configured: CONFIGURED,
    CATEGORIES: CATEGORIES, CATN: CATN,
    init: init,
    // datos (async)
    getProducts:function(){return A.getProducts();},
    getActiveProducts:function(){return A.getActiveProducts();},
    getProduct:function(id){return A.getProduct(id);},
    saveProduct:function(p){return A.saveProduct(p);},
    deleteProduct:function(id){return A.deleteProduct(id);},
    uploadImage:function(d){return A.uploadImage(d);},
    register:function(n,e,p){return A.register(n,e,p);},
    login:function(e,p){return A.login(e,p);},
    logout:function(){return A.logout();},
    createOrder:function(d){return A.createOrder(d);},
    getOrders:function(){return A.getOrders();},
    ordersForUser:function(id){return A.ordersForUser(id);},
    // síncronas
    currentUser:currentUser, isAdmin:isAdmin,
    getCart:getCart, cartDetailed:cartDetailed, addToCart:addToCart, setQty:setQty,
    removeFromCart:removeFromCart, clearCart:clearCart, cartCount:cartCount, cartTotal:cartTotal,
    money:money, productImages:productImages
  };
})(window);
