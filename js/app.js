/* ============================================================
   RENEWAL BLOOD NETWORK — SPA Router & App Controller
   ============================================================ */

const App = {
  currentPage: 'home',

  routes: {
    home:       () => App.loadHome(),
    'find-donor': () => App.loadFindDonor(),
    'register': () => App.loadRegister(),
    'emergency': () => App.loadEmergency(),
    'dashboard': () => App.loadDashboard(),
    'map':      () => App.loadMap(),
    'leaderboard': () => App.loadLeaderboard(),
  },

  async init() {
    await DataStore.init();
    this.setupNavbar();
    this.setupRouter();
    this.setupAuth();
    this.navigate(location.hash.slice(1) || 'home');
    this.setupMobileMenu();
    this.setupToastContainer();
  },

  navigate(page) {
    if (!page) page = 'home';
    this.currentPage = page;

    // Hide all pages
    if (page === 'admin') {
      window.location.href = 'http://localhost:8081'; // Redirect to standalone Admin Panel
      return;
    }

    // Hide all views
    document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));

    const view = document.getElementById('view-' + page);
    if (view) {
      view.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active nav
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === page);
    });

    location.hash = page;

    // Run route handler
    if (this.routes[page]) this.routes[page]();
  },

  setupRouter() {
    // All navigation links
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const pg = el.dataset.page;
        App.navigate(pg);
        App.closeMobileMenu();
      });
    });

    window.addEventListener('hashchange', () => {
      const pg = location.hash.slice(1);
      if (pg && pg !== App.currentPage) App.navigate(pg);
    });
  },

  setupNavbar() {
    window.addEventListener('scroll', () => {
      const nb = document.getElementById('navbar');
      if (nb) nb.classList.toggle('scrolled', window.scrollY > 30);
    });
  },

  setupMobileMenu() {
    const btn = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
      btn.addEventListener('click', () => menu.classList.toggle('open'));
      menu.addEventListener('click', (e) => {
        if (e.target === menu) App.closeMobileMenu();
      });
    }
  },

  closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.remove('open');
  },

  setupToastContainer() {
    if (!document.getElementById('toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'toast-container';
      tc.className = 'toast-container';
      document.body.appendChild(tc);
    }
  },

  setupAuth() {
    DataStore.onAuthStateChange(async (event, session) => {
      const btnLogin = document.getElementById('nav-login-btn');
      const btnLogout = document.getElementById('nav-logout-btn');
      if (session) {
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'block';
      } else {
        if (btnLogin) btnLogin.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'none';
      }
    });
  },

  async handleAuthSubmit() {
    const phone = document.getElementById('auth-phone').value.trim();
    const pin = document.getElementById('auth-pin').value.trim();
    const btn = document.getElementById('auth-submit-btn');
    
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      alert('সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      alert('৪-ডিজিটের গোপন পিন দিন');
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> অপেক্ষা করুন...';
    
    try {
      try {
        await DataStore.login(phone, pin);
      } catch (err) {
        if (err.message.includes('Invalid login credentials')) {
          alert('ভুল নম্বর বা পিন দিয়েছেন। আপনার অ্যাকাউন্ট না থাকলে নতুন করে নিবন্ধন করুন।');
        } else {
          alert('ত্রুটি: ' + err.message);
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> লগইন';
        return;
      }
      
      Modal.close('auth-modal');
      const user = await DataStore.getCurrentUser();
      if (user && user.isNew) {
        // Logged in but not a donor.
        App.navigate('register');
      } else {
        App.navigate('dashboard');
      }
      
    } catch (err) {
      alert('ত্রুটি হয়েছে: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> এগিয়ে যান';
    }
  },

  // ── Page Loaders ──
  loadHome()       { HomeModule.render(); },
  loadFindDonor()  { DonorModule.renderSearch(); },
  loadRegister()   { DonorModule.renderRegistration(); },
  loadEmergency()  { EmergencyModule.render(); },
  loadDashboard()  { DashboardModule.render(); },
  loadMap()        { MapModule.render(); },
  loadLeaderboard(){ LeaderboardModule.render(); },
};

// ── Toast Notification System ──
const Toast = {
  show({ title, message, type = 'info', duration = 4000 }) {
    const tc = document.getElementById('toast-container');
    if (!tc) return;

    const icons = {
      success: '<i class="fas fa-circle-check" style="color:var(--verified-green)"></i>',
      error: '<i class="fas fa-circle-xmark" style="color:var(--blood-red)"></i>',
      info: '<i class="fas fa-circle-info" style="color:var(--status-review)"></i>',
      warning: '<i class="fas fa-triangle-exclamation" style="color:var(--pending-amber)"></i>',
      emergency: '<i class="fas fa-bolt" style="color:#FF1744"></i>'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button onclick="this.closest('.toast').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.85rem;padding:0 0.25rem;"><i class="fas fa-xmark"></i></button>
    `;
    tc.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    return toast;
  }
};

// ── Modal System ──
const Modal = {
  open(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
      m.classList.add('hidden');
    });
    document.body.style.overflow = '';
  }
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});

// ── Counter Animation ──
function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const step = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString('en');
    if (current >= target) clearInterval(timer);
  }, 16);
}

// ── Intersection Observer for counters ──
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      if (!isNaN(target) && !el.dataset.animated) {
        el.dataset.animated = '1';
        animateCounter(el, target);
      }
    }
  });
}, { threshold: 0.5 });

window.App    = App;
window.Toast  = Toast;
window.Modal  = Modal;
window.counterObserver = counterObserver;
