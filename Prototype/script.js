const API_BASE_URL = window.location.origin;

function getAuthUser() {
  try {
    const rawUser = localStorage.getItem('authUser');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem('authUser');
  window.location.href = 'index.html';
}

function redirectToLogin() {
  window.location.href = 'index.html';
}

function setText(id, value, fallback = '-') {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const normalizedValue =
    value == null || String(value).trim() === '' ? fallback : String(value).trim();
  element.textContent = normalizedValue;
}

function formatDate(value, includeTime = false) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    ...(includeTime ? { timeStyle: 'short' } : {}),
  }).format(date);
}

function titleCase(value) {
  if (!value) {
    return '-';
  }

  return String(value)
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function showAuthMessage(text, isError = false) {
  const authMsg = document.getElementById('authMsg');
  if (!authMsg) {
    return;
  }

  authMsg.textContent = text;
  authMsg.classList.remove('ok', 'err');

  if (!text) {
    return;
  }

  authMsg.classList.add(isError ? 'err' : 'ok');
}

function showStatus(elementId, text, type) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.textContent = text || '';
  element.classList.remove('ok', 'err');
  if (type) {
    element.classList.add(type);
  }
}

function setupAuthPage() {
  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (!tabs.length || !loginForm || !registerForm) {
    return;
  }

  function switchTab(tabName) {
    tabs.forEach((tab) => {
      tab.classList.toggle('on', tab.dataset.tab === tabName);
    });

    if (tabName === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    }

    showAuthMessage('');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll('.togglePass').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.parentElement?.querySelector('input');
      if (!input) {
        return;
      }

      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('regEmail')?.value?.trim();
    const password = document.getElementById('regPass')?.value;

    if (!email || !password) {
      showAuthMessage('Please enter email and password.', true);
      return;
    }

    const generatedName = email.split('@')[0] || 'user';

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generatedName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage(data.error || 'Registration failed.', true);
        return;
      }

      showAuthMessage('Registration successful. You can now log in.');
      registerForm.reset();
      switchTab('login');

      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) {
        loginEmailInput.value = email;
      }
    } catch (error) {
      showAuthMessage('Could not connect to server.', true);
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPass')?.value;

    if (!email || !password) {
      showAuthMessage('Please enter email and password.', true);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage(data.error || 'Login failed.', true);
        return;
      }

      localStorage.setItem('authUser', JSON.stringify(data.user));
      showAuthMessage('Login successful. Redirecting...');
      window.location.href = 'home.html';
    } catch (error) {
      showAuthMessage('Could not connect to server.', true);
    }
  });

  switchTab('login');
}

function setupNavigation() {
  document.querySelectorAll('.logout-btn').forEach((button) => {
    button.addEventListener('click', logoutUser);
  });

  document.getElementById('goAppointments')?.addEventListener('click', () => {
    window.location.href = 'doctor.html';
  });

  document.getElementById('goCalendar')?.addEventListener('click', () => {
    window.location.href = 'calendar.html';
  });

  document.getElementById('goRecords')?.addEventListener('click', () => {
    window.location.href = 'records.html';
  });

  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  const openButton = document.getElementById('hamburger');
  const closeButton = document.getElementById('closeMenuBtn');

  if (!sideMenu || !menuOverlay || !openButton) {
    return;
  }

  const openMenu = () => {
    sideMenu.classList.add('open');
    menuOverlay.classList.add('show');
    menuOverlay.setAttribute('aria-hidden', 'false');
  };

  const closeMenu = () => {
    sideMenu.classList.remove('open');
    menuOverlay.classList.remove('show');
    menuOverlay.setAttribute('aria-hidden', 'true');
  };

  openButton.addEventListener('click', openMenu);
  closeButton?.addEventListener('click', closeMenu);
  menuOverlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });
}

function renderMedicalRecord(record) {
  setText('recordUserName', record.user_name);
  setText(
    'recordUserMeta',
    `${record.user_email || '-'} | Record for user #${record.user_id}`
  );

  setText('field-name', record.user_name);
  setText('field-email', record.user_email);
  setText('field-dob', formatDate(record.date_of_birth));
  setText('field-gender', titleCase(record.gender));
  setText('field-phone', record.phone);
  setText('field-address', record.address);
  setText('field-blood-type', record.blood_type);
  setText('field-allergies', record.allergies);
  setText('field-diagnosis', record.diagnosis);
  setText('field-medications', record.medications);
  setText('field-emergency-name', record.emergency_contact_name);
  setText('field-emergency-phone', record.emergency_contact_phone);
  setText('field-created-at', formatDate(record.created_at, true));
  setText('field-updated-at', formatDate(record.updated_at, true));
}

function clearMedicalRecord() {
  [
    'field-name',
    'field-email',
    'field-dob',
    'field-gender',
    'field-phone',
    'field-address',
    'field-blood-type',
    'field-allergies',
    'field-diagnosis',
    'field-medications',
    'field-emergency-name',
    'field-emergency-phone',
    'field-created-at',
    'field-updated-at',
  ].forEach((id) => setText(id, '-'));
}

function setupMedicalRecordsPage() {
  const refreshButton = document.getElementById('refreshRecordBtn');
  if (!refreshButton) {
    return;
  }

  const authUser = getAuthUser();
  if (!authUser?.id) {
    redirectToLogin();
    return;
  }

  async function loadMedicalRecord() {
    showStatus('recordStatus', 'Loading medical record...', null);
    setText('recordUserName', authUser.name || 'Patient');
    setText('recordUserMeta', `Signed in as ${authUser.email || 'unknown user'}`);
    refreshButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/medical-records/${authUser.id}`);
      const data = await response.json();

      if (response.status === 404) {
        clearMedicalRecord();
        showStatus(
          'recordStatus',
          'No medical record exists yet for this user in the database.',
          'err'
        );
        setText('recordUserName', authUser.name || 'Patient');
        setText(
          'recordUserMeta',
          `${authUser.email || '-'} | User #${authUser.id}`
        );
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch medical record');
      }

      renderMedicalRecord(data);
      showStatus('recordStatus', 'Medical record loaded from TiDB.', 'ok');
    } catch (error) {
      clearMedicalRecord();
      showStatus(
        'recordStatus',
        error.message || 'Unable to load medical record.',
        'err'
      );
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener('click', loadMedicalRecord);
  loadMedicalRecord();
}

setupAuthPage();
setupNavigation();
setupMedicalRecordsPage();
