/* ============================================================
   RENEWAL BLOOD NETWORK — Data Store (Supabase)
   ============================================================
   Replaces the old localStorage DataStore with real Supabase
   database calls. All DataStore methods are now async.

   Supabase JS client is loaded from CDN (no bundler needed).
   Credentials are fetched from /api/config (served by server.js
   reading your .env file — never hardcoded here).
   ============================================================ */

/* ── Bangladesh Districts & Upazilas (static — unchanged) ── */
const BD_LOCATIONS = {
  'ঢাকা': ['সাভার','ধামরাই','কেরানীগঞ্জ','নবাবগঞ্জ','দোহার','মিরপুর','উত্তরা','গুলশান','বাড্ডা','মতিঝিল'],
  'গাজীপুর': ['টঙ্গী','গাজীপুর সদর','কালিগঞ্জ','কালীয়াকৈর','কাপাসিয়া','শ্রীপুর'],
  'নারায়ণগঞ্জ': ['নারায়ণগঞ্জ সদর','আড়াইহাজার','বন্দর','রূপগঞ্জ','সোনারগাঁও'],
  'চট্টগ্রাম': ['চট্টগ্রাম সদর','হাটহাজারী','পটিয়া','সীতাকুণ্ড','মিরসরাই','রাউজান','বোয়ালখালী','আনোয়ারা'],
  'সিলেট': ['সিলেট সদর','বিশ্বনাথ','জকিগঞ্জ','কোম্পানীগঞ্জ','গোয়াইনঘাট','বালাগঞ্জ'],
  'রাজশাহী': ['রাজশাহী সদর','বোয়ালিয়া','পবা','মোহনপুর','বাগমারা','তানোর'],
  'খুলনা': ['খুলনা সদর','সোনাডাঙ্গা','খালিশপুর','ডুমুরিয়া','বটিয়াঘাটা','ফুলতলা'],
  'বরিশাল': ['বরিশাল সদর','বাকেরগঞ্জ','বাবুগঞ্জ','উজিরপুর','মেহেন্দিগঞ্জ'],
  'ময়মনসিংহ': ['ময়মনসিংহ সদর','ভালুকা','ত্রিশাল','গফরগাঁও','মুক্তাগাছা'],
  'রংপুর': ['রংপুর সদর','গঙ্গাচড়া','তারাগঞ্জ','বদরগঞ্জ','মিঠাপুকুর'],
  'কুমিল্লা': ['কুমিল্লা সদর','দেবিদ্বার','বুড়িচং','চান্দিনা','দাউদকান্দি','লাকসাম'],
  'ফরিদপুর': ['ফরিদপুর সদর','নগরকান্দা','ভাঙ্গা','সালথা','আলফাডাঙ্গা'],
};

const BLOOD_GROUPS   = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const DONATION_TYPES = ['সম্পূর্ণ রক্ত (Whole Blood)','প্লাটেলেট (Platelet)','প্লাজমা (Plasma)','লাল রক্তকণিকা (RBC)'];
const CONTACT_PREFS  = ['phone','sms','whatsapp','renewal'];

/* ── Supabase client (initialised in DataStore.init) ── */
let _supabase = null;

/* ── Column name mapper: DB snake_case → app camelCase ── */
function _mapDonor(row) {
  if (!row) return null;
  return {
    id:                row.id,
    name:              row.name,
    nameEn:            row.name_en,
    phone:             row.phone,
    altPhone:          row.alt_phone,
    bloodGroup:        row.blood_group,
    district:          row.district,
    upazila:           row.upazila,
    area:              row.area,
    age:               row.age,
    gender:            row.gender,
    profession:        row.profession,
    lastDonation:      row.last_donation,
    donationCount:     row.donation_count,
    canDonate:         row.can_donate,
    nextAvailable:     row.next_available,
    donationTypes:     row.donation_types || [],
    emergencyCall:     row.emergency_call,
    contactPrefs:      row.contact_prefs || [],
    verificationLevel: row.verification_level,
    trustScore:        row.trust_score,
    badge:             row.badge,
    availability:      row.availability,
    donationHistory:   row.donation_history || [],
    verificationLog:   row.verification_log || [],
    joinDate:          row.join_date,
    suspicious:        row.suspicious,
    reported:          row.reported,
    lat:               row.lat,
    lng:               row.lng,
  };
}

function _mapRequest(row) {
  if (!row) return null;
  return {
    id:               row.id,
    patientName:      row.patient_name,
    bloodGroup:       row.blood_group,
    units:            row.units,
    hospital:         row.hospital,
    district:         row.district,
    upazila:          row.upazila,
    neededDate:       row.needed_date,
    neededTime:       row.needed_time,
    attendantName:    row.attendant_name,
    contact:          row.contact,
    reason:           row.reason,
    status:           row.status,
    submittedAt:      row.submitted_at,
    verifiedAt:       row.verified_at,
    reported:         row.reported,
    verificationNote: row.verification_note,
  };
}

function _mapContactRequest(row) {
  if (!row) return null;
  return {
    id:          row.id,
    donorId:     row.donor_id,
    patient:     row.patient,
    bloodGroup:  row.blood_group,
    hospital:    row.hospital,
    units:       row.units,
    phone:       row.phone,
    status:      row.status,
    submittedAt: row.submitted_at,
  };
}

/* ── DataStore ─────────────────────────────────────────────── */
const DataStore = {

  /* ── Initialise Supabase client ── */
  async init() {
    if (_supabase) return; // already initialised

    try {
      // Fetch credentials from our server (loaded from .env)
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Cannot reach /api/config');
      const { supabaseUrl, supabaseAnonKey } = await res.json();

      if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT')) {
        console.warn('[DataStore] Supabase credentials not set in .env — data will not load.');
        return;
      }

      // Load Supabase JS from CDN if not already present
      if (!window.supabase) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      _supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      console.log('[DataStore] Supabase client ready.');
    } catch (err) {
      console.error('[DataStore] Init failed:', err);
    }
  },

  /* ── Donors ── */
  async getDonors() {
    if (!_supabase) return [];
    const { data, error } = await _supabase
      .from('donors')
      .select('*')
      .order('trust_score', { ascending: false });
    if (error) { console.error('[DataStore] getDonors:', error.message); return []; }
    return (data || []).map(_mapDonor);
  },

  async getDonorById(id) {
    if (!_supabase) return null;
    const { data, error } = await _supabase
      .from('donors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) { console.error('[DataStore] getDonorById:', error.message); return null; }
    return _mapDonor(data);
  },

  async addDonor(donor) {
    if (!_supabase) return donor;
    const row = {
      id:                donor.id,
      name:              donor.name,
      name_en:           donor.nameEn,
      phone:             donor.phone,
      alt_phone:         donor.altPhone,
      blood_group:       donor.bloodGroup,
      district:          donor.district,
      upazila:           donor.upazila,
      area:              donor.area,
      age:               donor.age,
      gender:            donor.gender,
      profession:        donor.profession,
      last_donation:     donor.lastDonation || null,
      donation_count:    donor.donationCount,
      can_donate:        donor.canDonate,
      next_available:    donor.nextAvailable || null,
      donation_types:    donor.donationTypes || [],
      emergency_call:    donor.emergencyCall,
      contact_prefs:     donor.contactPrefs || [],
      verification_level: donor.verificationLevel,
      trust_score:       donor.trustScore,
      badge:             donor.badge,
      availability:      donor.availability,
      donation_history:  donor.donationHistory || [],
      verification_log:  donor.verificationLog || [],
      join_date:         donor.joinDate,
      suspicious:        donor.suspicious,
      reported:          donor.reported,
      lat:               donor.lat,
      lng:               donor.lng,
    };
    const { error } = await _supabase.from('donors').insert(row);
    if (error) console.error('[DataStore] addDonor:', error.message);
    return donor;
  },

  async updateDonor(id, updates) {
    if (!_supabase) return;
    // Map camelCase keys to snake_case for the DB
    const keyMap = {
      name: 'name', nameEn: 'name_en', phone: 'phone',
      bloodGroup: 'blood_group', district: 'district', upazila: 'upazila',
      area: 'area', age: 'age', gender: 'gender', profession: 'profession',
      lastDonation: 'last_donation', donationCount: 'donation_count',
      canDonate: 'can_donate', nextAvailable: 'next_available',
      donationTypes: 'donation_types', emergencyCall: 'emergency_call',
      contactPrefs: 'contact_prefs', verificationLevel: 'verification_level',
      trustScore: 'trust_score', badge: 'badge', availability: 'availability',
      donationHistory: 'donation_history', verificationLog: 'verification_log',
      joinDate: 'join_date', suspicious: 'suspicious', reported: 'reported',
      lat: 'lat', lng: 'lng',
    };
    const row = {};
    Object.entries(updates).forEach(([k, v]) => {
      const dbKey = keyMap[k] || k;
      row[dbKey] = v;
    });
    const { error } = await _supabase.from('donors').update(row).eq('id', id);
    if (error) console.error('[DataStore] updateDonor:', error.message);
  },

  async searchDonors({ bloodGroup, district, upazila, area, availability } = {}) {
    if (!_supabase) return [];
    let query = _supabase.from('donors').select('*');
    if (bloodGroup) query = query.eq('blood_group', bloodGroup);
    if (district)   query = query.eq('district', district);
    if (upazila)    query = query.eq('upazila', upazila);
    if (area)       query = query.ilike('area', `%${area}%`);
    if (availability === 'available') query = query.eq('availability', 'available');
    if (availability === 'soon')      query = query.in('availability', ['available', 'soon']);
    query = query.order('trust_score', { ascending: false });
    const { data, error } = await query;
    if (error) { console.error('[DataStore] searchDonors:', error.message); return []; }
    return (data || []).map(_mapDonor);
  },

  /* ── Blood Requests ── */
  async getRequests() {
    if (!_supabase) return [];
    const { data, error } = await _supabase
      .from('blood_requests')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) { console.error('[DataStore] getRequests:', error.message); return []; }
    return (data || []).map(_mapRequest);
  },

  async addRequest(req) {
    if (!_supabase) return req;
    const row = {
      id:               req.id,
      user_id:          req.userId || null,
      patient_name:     req.patientName,
      blood_group:      req.bloodGroup,
      units:            parseInt(req.units) || 1,
      hospital:         req.hospital,
      district:         req.district,
      upazila:          req.upazila,
      needed_date:      req.neededDate || null,
      needed_time:      req.neededTime,
      attendant_name:   req.attendantName,
      contact:          req.contact,
      reason:           req.reason,
      status:           req.status,
      submitted_at:     req.submittedAt,
      verified_at:      req.verifiedAt || null,
      reported:         req.reported || 0,
      verification_note: req.verificationNote || '',
    };
    const { error } = await _supabase.from('blood_requests').insert(row);
    if (error) console.error('[DataStore] addRequest:', error.message);
    return req;
  },

  async updateRequest(id, updates) {
    if (!_supabase) return;
    const keyMap = {
      patientName: 'patient_name', bloodGroup: 'blood_group', units: 'units',
      hospital: 'hospital', district: 'district', upazila: 'upazila',
      neededDate: 'needed_date', neededTime: 'needed_time',
      attendantName: 'attendant_name', contact: 'contact', reason: 'reason',
      status: 'status', submittedAt: 'submitted_at', verifiedAt: 'verified_at',
      reported: 'reported', verificationNote: 'verification_note',
    };
    const row = {};
    Object.entries(updates).forEach(([k, v]) => {
      const dbKey = keyMap[k] || k;
      if (v !== undefined) row[dbKey] = v;
    });
    const { error } = await _supabase.from('blood_requests').update(row).eq('id', id);
    if (error) console.error('[DataStore] updateRequest:', error.message);
  },

  /* ── Contact Requests ── */
  async getContactRequests() {
    if (!_supabase) return [];
    const { data, error } = await _supabase
      .from('contact_requests')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) { console.error('[DataStore] getContactRequests:', error.message); return []; }
    return (data || []).map(_mapContactRequest);
  },

  async addContactRequest(req) {
    if (!_supabase) return req;
    const row = {
      id:          req.id,
      user_id:     req.userId || null,
      donor_id:    req.donorId,
      patient:     req.patient,
      blood_group: req.bloodGroup,
      hospital:    req.hospital,
      units:       req.units,
      phone:       req.phone,
      status:      req.status,
      submitted_at: req.submittedAt,
    };
    const { error } = await _supabase.from('contact_requests').insert(row);
    if (error) console.error('[DataStore] addContactRequest:', error.message);
    return req;
  },

  async updateContactRequest(id, updates) {
    if (!_supabase) return;
    const { error } = await _supabase.from('contact_requests').update(updates).eq('id', id);
    if (error) console.error('[DataStore] updateContactRequest:', error.message);
  },

  /* ── Authentication ── */
  async signup(phone, pin) {
    if (!_supabase) return null;
    const email = `${phone}@renewalblood.com`;
    const password = `${pin}RenewalSec!`;
    const { data, error } = await _supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[Auth] Signup error:', error.message);
      throw error;
    }
    return data.user;
  },

  async login(phone, pin) {
    if (!_supabase) return null;
    const email = `${phone}@renewalblood.com`;
    const password = `${pin}RenewalSec!`;
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] Login error:', error.message);
      throw error;
    }
    return data.user;
  },

  async logout() {
    if (!_supabase) return;
    await _supabase.auth.signOut();
    window.location.hash = '#home';
    window.location.reload();
  },

  async getCurrentUser() {
    if (!_supabase) return null;
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return null;
    
    // Fetch donor profile if exists
    const { data: donor } = await _supabase.from('donors').select('*').eq('user_id', user.id).single();
    if (donor) {
      return _mapDonor(donor);
    }
    
    // Return base user if no donor profile yet
    return { id: user.id, isNew: true, phone: user.email.split('@')[0], name: 'User' };
  },

  onAuthStateChange(callback) {
    if (!_supabase) return;
    _supabase.auth.onAuthStateChange(callback);
  },

  /* ── Notifications (in-memory for session) ── */
  _notifications: [],
  getNotifications() { return this._notifications; },
  addNotification(notif) {
    this._notifications.unshift(notif);
    if (this._notifications.length > 50) this._notifications.length = 50;
  },

  /* ── Helpers ── */
  generateId(prefix) {
    return prefix + Date.now().toString(36).toUpperCase();
  },
};

/* ── Utils (unchanged) ── */
const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  monthsAgo(dateStr) {
    if (!dateStr) return null;
    const diff = new Date() - new Date(dateStr);
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (months === 0) return 'এই মাসে';
    if (months === 1) return '১ মাস আগে';
    return `${months} মাস আগে`;
  },
  maskPhone(phone) {
    return phone.replace(/(\d{4})\d+(\d{3})/, '$1***$2');
  },
  getStatusBadge(status) {
    const map = {
      pending:      { label: 'যাচাই বাকি', class: 'status-pending', icon: '<i class="fas fa-clock"></i>' },
      under_review: { label: 'পর্যালোচনা চলছে', class: 'status-review', icon: '<i class="fas fa-spinner fa-spin"></i>' },
      verified:     { label: 'যাচাইকৃত', class: 'status-verified', icon: '<i class="fas fa-circle-check"></i>' },
      rejected:     { label: 'প্রত্যাখ্যাত', class: 'status-rejected', icon: '<i class="fas fa-circle-xmark"></i>' },
      completed:    { label: 'সম্পন্ন', class: 'status-completed', icon: '<i class="fas fa-circle-check"></i>' },
      expired:      { label: 'মেয়াদোত্তীর্ণ', class: 'status-expired', icon: '<i class="fas fa-hourglass-end"></i>' },
    };
    return map[status] || map.pending;
  },
  getAvailabilityInfo(av) {
    const map = {
      available:   { label: 'পাওয়া যাচ্ছে', class: 'avail-yes', dot: 'dot-green' },
      soon:        { label: 'শীঘ্রই পাওয়া যাবে', class: 'avail-soon', dot: 'dot-amber' },
      unavailable: { label: 'এখন পাওয়া যাবে না', class: 'avail-no', dot: 'dot-red' },
    };
    return map[av] || map.unavailable;
  },
  getBadgeInfo(badge) {
    const map = {
      registered: { label: '<i class="fas fa-droplet"></i> নিবন্ধিত দাতা', class: 'badge-registered' },
      bronze:     { label: '<i class="fas fa-award" style="color:#cd7f32"></i> ব্রোঞ্জ দাতা', class: 'badge-bronze' },
      silver:     { label: '<i class="fas fa-award" style="color:#c0c0c0"></i> সিলভার দাতা', class: 'badge-silver' },
      gold:       { label: '<i class="fas fa-medal" style="color:#ffd700"></i> গোল্ড দাতা', class: 'badge-gold' },
      lifesaver:  { label: '<i class="fas fa-gem" style="color:#00e5ff"></i> লাইফ সেভার', class: 'badge-lifesaver' },
      verified:   { label: '<i class="fas fa-circle-check" style="color:#00e676"></i> যাচাইকৃত দাতা', class: 'badge-verified' },
    };
    return map[badge] || map.registered;
  },
  getVerificationLabel(level) {
    const labels = [
      'অযাচাইকৃত',
      '<i class="fas fa-mobile"></i> মোবাইল যাচাই',
      '<i class="fas fa-id-card"></i> পরিচয় যাচাই',
      '<i class="fas fa-droplet"></i> রক্তের গ্রুপ যাচাই',
      '<i class="fas fa-star"></i> রিনিউয়েল যাচাইকৃত'
    ];
    return labels[level] || labels[0];
  },
  calcTrustScore(donor) {
    let score = 0;
    if (donor.verificationLevel >= 1) score += 15;
    if (donor.verificationLevel >= 2) score += 20;
    if (donor.verificationLevel >= 3) score += 25;
    if (donor.verificationLevel >= 4) score += 20;
    const donations = Math.min(donor.donationCount, 10);
    score += donations * 2;
    if (!donor.reported) score += 5;
    return Math.min(score, 100);
  },
  toEnglishNum(n) { return String(n); }
};

window.DataStore     = DataStore;
window.Utils         = Utils;
window.BD_LOCATIONS  = BD_LOCATIONS;
window.BLOOD_GROUPS  = BLOOD_GROUPS;
window.DONATION_TYPES = DONATION_TYPES;
