/* ============================================================
   RENEWAL BLOOD NETWORK — Donor Module
   ============================================================ */

const DonorModule = {

  // ── SEARCH ──
  async renderSearch() {
    this.populateSearchFilters();
    await this.doSearch();
  },

  populateSearchFilters() {
    // Blood group dropdown
    const bgSel = document.getElementById('s-blood-group');
    if (bgSel && bgSel.options.length <= 1) {
      BLOOD_GROUPS.forEach(g => {
        const o = document.createElement('option');
        o.value = g; o.textContent = g;
        bgSel.appendChild(o);
      });
    }
    // District dropdown
    const distSel = document.getElementById('s-district');
    if (distSel && distSel.options.length <= 1) {
      Object.keys(BD_LOCATIONS).forEach(d => {
        const o = document.createElement('option');
        o.value = d; o.textContent = d;
        distSel.appendChild(o);
      });
    }
    // Listen for district change
    if (distSel) {
      distSel.onchange = () => {
        const upSel = document.getElementById('s-upazila');
        if (!upSel) return;
        const dist = distSel.value;
        upSel.innerHTML = '<option value="">সব উপজেলা</option>';
        if (dist && BD_LOCATIONS[dist]) {
          BD_LOCATIONS[dist].forEach(u => {
            const o = document.createElement('option');
            o.value = u; o.textContent = u;
            upSel.appendChild(o);
          });
        }
      };
    }
  },

  async doSearch() {
    const bg   = document.getElementById('s-blood-group')?.value || '';
    const dist = document.getElementById('s-district')?.value || '';
    const up   = document.getElementById('s-upazila')?.value || '';
    const avl  = document.getElementById('s-availability')?.value || '';

    const container = document.getElementById('donor-results');
    const countEl   = document.getElementById('result-count');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div><p>দাতা খোঁজা হচ্ছে...</p></div>';

    const donors = await DataStore.searchDonors({
      bloodGroup: bg, district: dist, upazila: up, availability: avl
    });

    if (countEl) countEl.textContent = `${donors.length} জন দাতা পাওয়া গেছে`;

    if (donors.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon"><i class="fas fa-droplet"></i></div>
          <p>এই এলাকায় কোনো দাতা পাওয়া যায়নি।<br>অনুগ্রহ করে অন্য ফিল্টার ব্যবহার করুন।</p>
        </div>`;
      return;
    }

    container.innerHTML = donors.map(d => this.renderDonorCard(d)).join('');
  },

  renderDonorCard(d) {
    const avail = Utils.getAvailabilityInfo(d.availability);
    const badge = Utils.getBadgeInfo(d.badge);
    const initials = d.name.charAt(0);
    const lastDon = Utils.monthsAgo(d.lastDonation);
    const vLevel = d.verificationLevel;

    const verifyChips = [
      { label: '<i class="fas fa-mobile"></i> মোবাইল', done: vLevel >= 1 },
      { label: '<i class="fas fa-id-card"></i> পরিচয়', done: vLevel >= 2 },
      { label: '<i class="fas fa-droplet"></i> রক্তের গ্রুপ', done: vLevel >= 3 },
      { label: '<i class="fas fa-star"></i> রিনিউয়েল', done: vLevel >= 4 },
    ].filter(c => c.done).map(c => `<span class="verify-chip done">${c.label} <i class="fas fa-check"></i></span>`).join('');

    return `
    <div class="donor-card anim-fadeInUp">
      <div class="donor-card-header">
        <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0">
          <div class="donor-avatar">${initials}</div>
          <div style="min-width:0">
            <div class="donor-name">${d.name}</div>
            <div class="donor-location"><i class="fas fa-location-dot"></i> ${d.area}, ${d.upazila}, ${d.district}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;flex-shrink:0">
          <span class="bg-badge large">${d.bloodGroup}</span>
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.75rem">
        ${verifyChips}
        <span class="donor-badge ${badge.class}">${badge.label}</span>
      </div>

      <div class="donor-card-meta">
        <div class="donor-meta-item">
          <span class="donor-meta-label">অবস্থা</span>
          <span class="avail-dot ${avail.dot} ${avail.class}">${avail.label}</span>
        </div>
        <div class="donor-meta-item">
          <span class="donor-meta-label">শেষ রক্তদান</span>
          <span class="donor-meta-value">${lastDon || 'প্রথমবার'}</span>
        </div>
        <div class="donor-meta-item">
          <span class="donor-meta-label">রক্তদানের সংখ্যা</span>
          <span class="donor-meta-value">${d.donationCount} বার</span>
        </div>
        <div class="donor-meta-item">
          <span class="donor-meta-label">Trust Score</span>
          <div style="display:flex;align-items:center;gap:0.4rem">
            <div class="trust-bar-track"><div class="trust-bar-fill" style="width:${d.trustScore}%"></div></div>
            <span class="trust-score-num"><i class="fas fa-star" style="color:#FFD700;font-size:0.7em"></i> ${d.trustScore}</span>
          </div>
        </div>
      </div>

      <div class="donor-card-actions">
        <button class="btn btn-primary btn-sm"
          onclick="DonorModule.openContactModal('${d.id}')">
          <i class="fas fa-paper-plane"></i> যোগাযোগের অনুরোধ
        </button>
        ${d.emergencyCall ? `<button class="btn btn-ghost btn-icon btn-sm" title="সরাসরি ফোন" onclick="DonorModule.openDirectCallModal('${d.id}')"><i class="fas fa-phone"></i></button>` : ''}
      </div>
    </div>`;
  },

  async openContactModal(donorId) {
    const donor = await DataStore.getDonorById(donorId);
    if (!donor) return;

    document.getElementById('contact-donor-name').textContent = donor.name;
    document.getElementById('contact-donor-blood').textContent = donor.bloodGroup;
    document.getElementById('contact-donor-id').value = donorId;

    Modal.open('contact-modal');
  },

  openDirectCallModal(donorId) {
    Toast.show({
      type: 'info',
      title: 'Direct Call Info',
      message: 'এই দাতা সরাসরি যোগাযোগের অনুমতি দিয়েছেন। Renewal Foundation-এর মাধ্যমে যোগাযোগ করুন।'
    });
  },

  async submitContactRequest() {
    let authUser = await DataStore.getCurrentUser();
    if (!authUser) {
      Modal.close('contact-modal');
      Toast.show({ type: 'error', title: 'লগইন করুন', message: 'যোগাযোগের অনুরোধ পাঠাতে আপনাকে লগইন করতে হবে।' });
      Modal.open('auth-modal');
      return;
    }

    const form = document.getElementById('contact-request-form');
    const donorId = document.getElementById('contact-donor-id').value;
    const patient = document.getElementById('cr-patient').value.trim();
    const bloodGroup = document.getElementById('cr-blood').value;
    const hospital = document.getElementById('cr-hospital').value.trim();
    const units = document.getElementById('cr-units').value;
    const phone = document.getElementById('cr-phone').value.trim();

    if (!patient || !bloodGroup || !hospital || !phone) {
      Toast.show({ type: 'error', title: 'ত্রুটি', message: 'সব তথ্য পূরণ করুন।' });
      return;
    }

    const req = {
      id: DataStore.generateId('CR'),
      userId: authUser.id,
      donorId, patient, bloodGroup, hospital, units, phone,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    await DataStore.addContactRequest(req);
    Modal.close('contact-modal');

    Toast.show({
      type: 'success',
      title: 'অনুরোধ পাঠানো হয়েছে!',
      message: 'Renewal Foundation শীঘ্রই আপনার সাথে যোগাযোগ করবে।',
      duration: 5000
    });
    form.reset();
  },

  // ── REGISTRATION ──
  currentStep: 1,

  renderRegistration() {
    this.currentStep = 1;
    this.populateRegisterSelects();
    this.updateWizardStep(1);
  },

  populateRegisterSelects() {
    // Blood group
    const bgSel = document.getElementById('r-blood-group');
    if (bgSel && bgSel.options.length <= 1) {
      BLOOD_GROUPS.forEach(g => {
        const o = document.createElement('option');
        o.value = g; o.textContent = g;
        bgSel.appendChild(o);
      });
    }
    // District
    const distSel = document.getElementById('r-district');
    if (distSel && distSel.options.length <= 1) {
      Object.keys(BD_LOCATIONS).forEach(d => {
        const o = document.createElement('option');
        o.value = d; o.textContent = d;
        distSel.appendChild(o);
      });
    }
    if (distSel) {
      distSel.onchange = () => {
        const upSel = document.getElementById('r-upazila');
        if (!upSel) return;
        upSel.innerHTML = '<option value="">উপজেলা/থানা বেছে নিন</option>';
        const dist = distSel.value;
        if (dist && BD_LOCATIONS[dist]) {
          BD_LOCATIONS[dist].forEach(u => {
            const o = document.createElement('option');
            o.value = u; o.textContent = u;
            upSel.appendChild(o);
          });
        }
      };
    }
    // Donation types
    const dtSel = document.getElementById('r-donation-types');
    if (dtSel && dtSel.children.length === 0) {
      DONATION_TYPES.forEach(t => {
        const label = document.createElement('label');
        label.className = 'check-item';
        label.innerHTML = `<input type="checkbox" value="${t}"><label>${t}</label>`;
        dtSel.appendChild(label);
      });
    }
  },

  updateWizardStep(step) {
    this.currentStep = step;
    document.querySelectorAll('.wizard-step').forEach((el, i) => {
      const s = i + 1;
      el.classList.toggle('active', s === step);
      el.classList.toggle('done', s < step);
    });
    document.querySelectorAll('.wizard-pane').forEach((pane, i) => {
      pane.classList.toggle('active', i + 1 === step);
    });
  },

  nextStep() {
    if (!this.validateStep(this.currentStep)) return;
    this.updateWizardStep(this.currentStep + 1);
  },

  prevStep() {
    if (this.currentStep > 1) this.updateWizardStep(this.currentStep - 1);
  },

  validateStep(step) {
    if (step === 1) {
      const name = document.getElementById('r-name')?.value.trim();
      const phone = document.getElementById('r-phone')?.value.trim();
      const district = document.getElementById('r-district')?.value;
      const age = document.getElementById('r-age')?.value;
      if (!name || !phone || !district || !age) {
        Toast.show({ type: 'error', title: 'তথ্য অসম্পূর্ণ', message: 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন।' });
        return false;
      }
      if (!/^01[3-9]\d{8}$/.test(phone)) {
        Toast.show({ type: 'error', title: 'ভুল নম্বর', message: 'সঠিক বাংলাদেশী মোবাইল নম্বর দিন।' });
        return false;
      }
    }
    if (step === 2) {
      const bg = document.getElementById('r-blood-group')?.value;
      if (!bg) {
        Toast.show({ type: 'error', title: 'রক্তের গ্রুপ নির্বাচন করুন' });
        return false;
      }
    }
    return true;
  },

  async goToStep3() {
    if (!this.validateStep(1) || !this.validateStep(2)) return;
    
    // Check if already logged in
    const user = await DataStore.getCurrentUser();
    if (user && !user.isNew) {
      Toast.show({ type: 'info', title: 'ইতিমধ্যেই নিবন্ধিত', message: 'আপনি ইতিমধ্যেই দাতা হিসেবে নিবন্ধিত আছেন।' });
      App.navigate('dashboard');
      return;
    }
    if (user && user.isNew) {
      // Logged in but not a donor yet. Skip PIN step.
      this.submitRegistration();
      return;
    }

    this.updateWizardStep(3);
  },

  async submitRegistration() {
    let authUser = await DataStore.getCurrentUser();
    const phone = document.getElementById('r-phone')?.value.trim();
    
    if (!authUser) {
      const pin = document.getElementById('r-pin')?.value.trim();
      if (!/^\d{4}$/.test(pin)) {
        Toast.show({ type: 'error', title: 'পিন দিন', message: '৪-ডিজিটের গোপন পিন দিন।' });
        return;
      }
      
      try {
        await DataStore.signup(phone, pin);
        await DataStore.login(phone, pin);
        authUser = await DataStore.getCurrentUser();
      } catch (err) {
        if (err.message.includes('already registered')) {
          Toast.show({ type: 'error', title: 'নম্বরটি ব্যবহৃত', message: 'এই নম্বর দিয়ে ইতিমধ্যেই অ্যাকাউন্ট আছে। লগইন করুন।' });
        } else {
          Toast.show({ type: 'error', title: 'ত্রুটি', message: err.message });
        }
        return;
      }
    }

    const getVal = id => document.getElementById(id)?.value.trim() || '';
    const getChk = id => document.getElementById(id)?.checked || false;

    const donationTypes = Array.from(
      document.querySelectorAll('#r-donation-types input[type=checkbox]:checked')
    ).map(c => c.value);

    const contactPrefs = ['phone','sms','whatsapp','renewal'].filter(p =>
      document.getElementById('cp-' + p)?.checked
    );

    const donor = {
      id: authUser.id,
      user_id: authUser.id,
      name: getVal('r-name'),
      nameEn: getVal('r-name'),
      phone: getVal('r-phone'),
      altPhone: getVal('r-alt-phone'),
      bloodGroup: getVal('r-blood-group'),
      district: getVal('r-district'),
      upazila: getVal('r-upazila'),
      area: getVal('r-area'),
      age: parseInt(getVal('r-age')) || 0,
      gender: getVal('r-gender'),
      profession: getVal('r-profession'),
      lastDonation: getVal('r-last-donation') || null,
      donationCount: parseInt(getVal('r-donation-count')) || 0,
      canDonate: getVal('r-can-donate') === 'yes',
      nextAvailable: getVal('r-next-date') || null,
      donationTypes,
      emergencyCall: getChk('r-emergency-call'),
      contactPrefs,
      verificationLevel: 1,
      trustScore: 15,
      badge: 'registered',
      availability: 'available',
      donationHistory: [],
      verificationLog: [{ type: 'mobile', date: new Date().toISOString().split('T')[0], note: 'PIN verified' }],
      joinDate: new Date().toISOString().split('T')[0],
      suspicious: false, reported: 0,
      lat: 23.8 + Math.random() * 0.5,
      lng: 90.3 + Math.random() * 0.3,
    };

    await DataStore.addDonor(donor);

    // Show success
    document.getElementById('register-form-card').style.display = 'none';
    document.getElementById('register-success').style.display = 'block';
    document.getElementById('reg-success-name').textContent = donor.name;
    document.getElementById('reg-success-id').textContent = donor.id;

    Toast.show({
      type: 'success',
      title: 'নিবন্ধন সফল!',
      message: `স্বাগতম ${donor.name}! আপনি সফলভাবে রক্তদাতা হিসেবে নিবন্ধিত হয়েছেন।`,
      duration: 6000
    });

    setTimeout(() => {
      Toast.show({
        type: 'info',
        title: 'এলাকার দাতাদের জানানো হচ্ছে',
        message: `আপনার এলাকায় ${donor.bloodGroup} রক্তের দাতাদের তালিকায় আপনাকে যোগ করা হয়েছে।`,
        duration: 5000
      });
    }, 2000);
  },
};

// OTP Input auto-advance
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('otp-input')) {
    const inputs = [...document.querySelectorAll('.otp-input')];
    const idx = inputs.indexOf(e.target);
    if (e.target.value && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    }
    e.target.classList.toggle('filled', !!e.target.value);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.classList.contains('otp-input') && e.key === 'Backspace' && !e.target.value) {
    const inputs = [...document.querySelectorAll('.otp-input')];
    const idx = inputs.indexOf(e.target);
    if (idx > 0) inputs[idx - 1].focus();
  }
});

window.DonorModule = DonorModule;
