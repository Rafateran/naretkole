/* NARETKOLE — interacciones, parallax y partículas esotéricas */
(function(){
  'use strict';

  /* ---- Nav: scroll + burger ---- */
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.burger');
  const links = document.querySelector('.nav-links');
  if(nav){
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    });
  }
  if(burger && links){
    burger.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  /* ---- Reveal on scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---- Parallax por scroll ---- */
  const parallaxEls = document.querySelectorAll('[data-speed]');
  let ticking = false;
  function onScroll(){
    const y = window.scrollY;
    parallaxEls.forEach(el => {
      const s = parseFloat(el.dataset.speed);
      el.style.transform = 'translate3d(0,' + (y * s) + 'px,0)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => { if(!ticking){ requestAnimationFrame(onScroll); ticking = true; } });

  /* ---- Parallax por mouse en el hero ---- */
  const hero = document.querySelector('.hero');
  if(hero){
    hero.addEventListener('mousemove', (e) => {
      const cx = (e.clientX / window.innerWidth - .5);
      const cy = (e.clientY / window.innerHeight - .5);
      hero.querySelectorAll('.hero-layer').forEach((l,i) => {
        const d = (i+1) * 14;
        l.style.transform = 'translate3d(' + (cx*d) + 'px,' + (cy*d) + 'px,0)';
      });
    });
  }

  /* ---- Canvas de partículas ---- */
  const canvas = document.getElementById('stars');
  if(canvas){
    const ctx = canvas.getContext('2d');
    let w, h, parts;
    function resize(){
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(120, Math.floor(w*h/14000));
      parts = Array.from({length:count}, () => ({
        x:Math.random()*w, y:Math.random()*h,
        r:Math.random()*1.6+.3,
        vx:(Math.random()-.5)*.15, vy:(Math.random()-.5)*.15,
        a:Math.random()*.6+.2, tw:Math.random()*.02+.005
      }));
    }
    function draw(){
      ctx.clearRect(0,0,w,h);
      for(const p of parts){
        p.x += p.vx; p.y += p.vy;
        p.a += p.tw; if(p.a>1||p.a<.15) p.tw*=-1;
        if(p.x<0)p.x=w; if(p.x>w)p.x=0; if(p.y<0)p.y=h; if(p.y>h)p.y=0;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = 'rgba(244,212,122,' + p.a.toFixed(2) + ')';
        ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(212,164,57,.8)';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize);
    resize(); draw();
  }

  /* ---- Filtros de productos ---- */
  const filters = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.card[data-cat]');
  if(filters.length){
    filters.forEach(f => f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      const cat = f.dataset.filter;
      cards.forEach(c => {
        const show = cat === 'todos' || c.dataset.cat === cat;
        c.style.display = show ? '' : 'none';
        if(show){ c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); }
      });
    }));
  }

  /* ---- Añadir / reservar (demo) ---- */
  document.querySelectorAll('.card-btn').forEach(b => b.addEventListener('click', () => {
    const name = b.closest('.card').querySelector('h3').textContent;
    toast('“' + name + '” añadido a tu consulta ✦');
  }));

  /* ---- Toast ---- */
  function toast(msg){
    let t = document.querySelector('.toast');
    if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t);
      Object.assign(t.style,{position:'fixed',bottom:'26px',left:'50%',transform:'translateX(-50%) translateY(20px)',
        background:'linear-gradient(120deg,#d4a439,#b07227)',color:'#0b0705',padding:'14px 26px',borderRadius:'30px',
        fontSize:'14px',letterSpacing:'1px',zIndex:'999',opacity:'0',transition:'.4s',boxShadow:'0 12px 40px rgba(0,0,0,.5)'});
    }
    t.textContent = msg;
    requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
    clearTimeout(t._h);
    t._h = setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; }, 2600);
  }

  /* ---- Formularios Netlify ---- */
  document.querySelectorAll('form[data-demo]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const showOk = () => {
        const ok = form.querySelector('.form-ok');
        form.querySelectorAll('.field, .form-note, .btn').forEach(el => el.style.display='none');
        if(ok) ok.classList.add('show');
        else toast('Recibido ✦ Te contactaremos pronto');
      };
      // Netlify elimina `data-netlify` del HTML publicado después de detectar
      // el formulario. El campo oculto `form-name` sí permanece disponible.
      const netlifyFormName = form.querySelector('input[name="form-name"]');
      if(netlifyFormName && netlifyFormName.value){
        const body = new URLSearchParams(new FormData(form)).toString();
        fetch('/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body })
          .then(response => {
            if(!response.ok) throw new Error('Netlify Forms respondió con ' + response.status);
            showOk();
          })
          .catch(() => toast('No pudimos enviar tu solicitud. Intenta de nuevo.'));
      } else {
        showOk();
      }
    });
  });

  /* ---- Login demo ---- */
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForm = document.getElementById('authForm');
  let mode = 'login';
  if(authTabs.length){
    authTabs.forEach(t => t.addEventListener('click', () => {
      authTabs.forEach(x=>x.classList.remove('active')); t.classList.add('active');
      mode = t.dataset.mode;
      document.getElementById('authTitle').textContent = mode==='login' ? 'Bienvenido de vuelta' : 'Únete a la casa';
      document.getElementById('authSubmit').textContent = mode==='login' ? 'Entrar' : 'Crear cuenta';
      document.getElementById('nameField').style.display = mode==='login' ? 'none' : 'block';
    }));
  }
  if(authForm){
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = document.getElementById('authMsg');
      const email = authForm.email.value.trim();
      const pass = authForm.password.value.trim();
      if(!email || !pass){ msg.className='auth-msg err'; msg.textContent='Completa todos los campos.'; return; }
      if(pass.length < 4){ msg.className='auth-msg err'; msg.textContent='La contraseña es muy corta.'; return; }
      msg.className='auth-msg ok';
      msg.textContent = mode==='login' ? '✦ Portal abierto. Ashé, ' + email.split('@')[0] : '✦ Cuenta creada. Bienvenido a Naretkole.';
      setTimeout(()=>{ window.location.href='index.html'; }, 1600);
    });
  }

  /* ---- Año footer ---- */
  document.querySelectorAll('.year').forEach(y => y.textContent = new Date().getFullYear());
})();
