/* NARETKOLE — estado global de nav (carrito + cuenta) en todas las páginas */
(function(){
  'use strict';
  if(!window.NK) return;

  function updateNav(){
    document.querySelectorAll('#cartCount').forEach(function(el){
      var n = NK.cartCount();
      el.textContent = n;
      el.style.display = n > 0 ? 'grid' : 'none';
    });
    var u = NK.currentUser();
    document.querySelectorAll('.accountLink').forEach(function(a){
      if(u){
        a.textContent = u.rol === 'admin' ? 'Panel admin' : 'Mi cuenta';
        a.href = u.rol === 'admin' ? 'admin.html' : 'cuenta.html';
      } else {
        a.textContent = 'Iniciar sesión';
        a.href = 'login.html';
      }
    });
  }

  window.NKUI = { updateNav: updateNav };

  NK.init().then(function(){ updateNav(); });
  document.addEventListener('DOMContentLoaded', updateNav);
})();
