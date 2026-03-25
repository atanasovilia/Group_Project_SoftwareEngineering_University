const API_BASE_URL = window.location.origin;

function getAuthUser() {
  try {
    const rawUser = localStorage.getItem('authUser');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
}

function formatIsoDate(date) {
	return date.toISOString().slice(0, 10);
}

function getMonday(date = new Date()) {
	const result = new Date(date);
	const day = result.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	result.setDate(result.getDate() + diff);
	result.setHours(0, 0, 0, 0);
	return result;
}

function renderStatusMessage(element, text, type = '') {
	if (!element) {
		return;
	}

	element.textContent = text;
	element.className = `status${type ? ` ${type}` : ''}`;
}

function getHeatClass(totalSlots) {
	if (totalSlots >= 8) return 'ok';
	if (totalSlots >= 5) return 'mid';
	if (totalSlots >= 1) return 'low';
	return 'none';
}

function formatSlotSummary(slots) {
	if (!slots || slots.length === 0) {
		return 'No availability';
	}

	return slots.map((slot) => `${slot.start_time}-${slot.end_time}`).join(', ');
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

function populateMedicalRecordForm(record) {
  const values = {
    'input-dob': record?.date_of_birth ? String(record.date_of_birth).slice(0, 10) : '',
    'input-gender': record?.gender || '',
    'input-phone': record?.phone || '',
    'input-address': record?.address || '',
    'input-blood-type': record?.blood_type || '',
    'input-allergies': record?.allergies || '',
    'input-diagnosis': record?.diagnosis || '',
    'input-medications': record?.medications || '',
    'input-emergency-name': record?.emergency_contact_name || '',
    'input-emergency-phone': record?.emergency_contact_phone || '',
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = value;
    }
  });
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

function getMedicalRecordPayload() {
  return {
    date_of_birth: document.getElementById('input-dob')?.value?.trim() || '',
    gender: document.getElementById('input-gender')?.value || null,
    phone: document.getElementById('input-phone')?.value?.trim() || null,
    address: document.getElementById('input-address')?.value?.trim() || null,
    blood_type: document.getElementById('input-blood-type')?.value || null,
    allergies: document.getElementById('input-allergies')?.value?.trim() || null,
    diagnosis: document.getElementById('input-diagnosis')?.value?.trim() || null,
    medications: document.getElementById('input-medications')?.value?.trim() || null,
    emergency_contact_name: document.getElementById('input-emergency-name')?.value?.trim() || null,
    emergency_contact_phone: document.getElementById('input-emergency-phone')?.value?.trim() || null,
  };
}

function setupMedicalRecordsPage() {
  const refreshButton = document.getElementById('refreshRecordBtn');
  const recordForm = document.getElementById('recordForm');
  const saveButton = document.getElementById('saveRecordBtn');
  const resetButton = document.getElementById('resetRecordFormBtn');
  if (!refreshButton || !recordForm || !saveButton || !resetButton) {
    return;
  }

  const authUser = getAuthUser();
  if (!authUser?.id) {
    redirectToLogin();
    return;
  }

  let currentRecord = null;

  async function loadMedicalRecord() {
    showStatus('recordStatus', 'Loading medical record...', null);
    setText('recordUserName', authUser.name || 'Patient');
    setText('recordUserMeta', `Signed in as ${authUser.email || 'unknown user'}`);
    refreshButton.disabled = true;
    saveButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/medical-records/${authUser.id}`);
      const data = await response.json();

      if (response.status === 404) {
        currentRecord = null;
        clearMedicalRecord();
        populateMedicalRecordForm(null);
        showStatus(
          'recordStatus',
          'No medical record exists yet. Please complete the form below to create one.',
          'err'
        );
        setText('recordUserName', authUser.name || 'Patient');
        setText(
          'recordUserMeta',
          `${authUser.email || '-'} | User #${authUser.id}`
        );
        setText(
          'recordFormMeta',
          'No record was found for this account. Complete the form below to create your first medical record.'
        );
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch medical record');
      }

      currentRecord = data;
      renderMedicalRecord(data);
      populateMedicalRecordForm(data);
      setText(
        'recordFormMeta',
        'Your existing medical record is loaded below. Edit any field and save to update the database.'
      );
      showStatus('recordStatus', 'Medical record loaded from TiDB.', 'ok');
    } catch (error) {
      currentRecord = null;
      clearMedicalRecord();
      populateMedicalRecordForm(null);
      showStatus(
        'recordStatus',
        error.message || 'Unable to load medical record.',
        'err'
      );
      setText(
        'recordFormMeta',
        'The current record could not be loaded. You can still try entering your information and saving it.'
      );
    } finally {
      refreshButton.disabled = false;
      saveButton.disabled = false;
    }
  }

  async function saveMedicalRecord(event) {
    event.preventDefault();

    const payload = getMedicalRecordPayload();
    if (!payload.date_of_birth) {
      showStatus('recordStatus', 'Date of birth is required before saving.', 'err');
      document.getElementById('input-dob')?.focus();
      return;
    }

    saveButton.disabled = true;
    refreshButton.disabled = true;
    showStatus('recordStatus', 'Saving medical record...', null);

    try {
      const response = await fetch(`${API_BASE_URL}/medical-records/${authUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save medical record');
      }

      currentRecord = data.record || null;
      if (currentRecord) {
        renderMedicalRecord(currentRecord);
        populateMedicalRecordForm(currentRecord);
      }

      setText(
        'recordFormMeta',
        'Your record is saved. You can come back and update these details at any time.'
      );
      showStatus('recordStatus', data.message || 'Medical record saved successfully.', 'ok');
    } catch (error) {
      showStatus(
        'recordStatus',
        error.message || 'Unable to save medical record.',
        'err'
      );
    } finally {
      saveButton.disabled = false;
      refreshButton.disabled = false;
    }
  }

  function resetMedicalRecordForm() {
    populateMedicalRecordForm(currentRecord);
    if (currentRecord) {
      showStatus('recordStatus', 'Form reset to the saved medical record.', 'ok');
    } else {
      recordForm.reset();
      showStatus('recordStatus', 'Form cleared. Enter your details to create a record.', null);
    }
  }

  refreshButton.addEventListener('click', loadMedicalRecord);
  recordForm.addEventListener('submit', saveMedicalRecord);
  resetButton.addEventListener('click', resetMedicalRecordForm);
  loadMedicalRecord();
}

function setupHomeBookingDashboard() {
	const doctorSelect = document.getElementById('doctorSelect');
	const doctorList = document.getElementById('doctorList');
	const monthGrid = document.getElementById('monthGrid');
	const monthLabel = document.getElementById('monthLabel');
	const monthPrevBtn = document.getElementById('monthPrevBtn');
	const monthNextBtn = document.getElementById('monthNextBtn');
	const timeSlotGrid = document.getElementById('timeSlotGrid');
	const statusMsg = document.getElementById('statusMsg');
	const selectedDoctorText = document.getElementById('selectedDoctorText');
	const selectedDateText = document.getElementById('selectedDateText');
	const selectedTimeText = document.getElementById('selectedTimeText');
	const hamburger = document.getElementById('hamburger');
	const sideMenu = document.getElementById('sideMenu');
	const closeMenuBtn = document.getElementById('closeMenuBtn');
	const menuOverlay = document.getElementById('menuOverlay');

	if (
		!doctorSelect ||
		!doctorList ||
		!monthGrid ||
		!monthLabel ||
		!monthPrevBtn ||
		!monthNextBtn ||
		!timeSlotGrid ||
		!statusMsg ||
		!selectedDoctorText ||
		!selectedDateText ||
		!selectedTimeText
	) {
		return;
	}

	const state = {
		doctors: [],
		selectedDoctorId: '',
		selectedDate: '',
		selectedSlot: '',
		currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
	};

	function openMenu() {
		sideMenu?.classList.add('open');
		menuOverlay?.classList.add('show');
	}

	function closeMenu() {
		sideMenu?.classList.remove('open');
		menuOverlay?.classList.remove('show');
	}

	hamburger?.addEventListener('click', openMenu);
	closeMenuBtn?.addEventListener('click', closeMenu);
	menuOverlay?.addEventListener('click', closeMenu);

	function getSelectedDoctor() {
		return state.doctors.find((doctor) => String(doctor.id) === String(state.selectedDoctorId)) || null;
	}

	function updateSummary() {
		const doctor = getSelectedDoctor();
		selectedDoctorText.textContent = doctor ? `${doctor.full_name} (${doctor.specialty})` : 'None selected';
		selectedDateText.textContent = state.selectedDate || 'None selected';
		selectedTimeText.textContent = state.selectedSlot || 'None selected';
	}

	function renderDoctorButtons() {
		doctorList.innerHTML = '';

		state.doctors.forEach((doctor) => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `doctorSelectCard${
				String(doctor.id) === String(state.selectedDoctorId) ? ' selected' : ''
			}`;
			button.innerHTML = `
				<span class="doctorSelectName">${doctor.full_name}</span>
				<span class="doctorSelectMeta">${doctor.specialty}</span>
			`;
			button.addEventListener('click', () => {
				doctorSelect.value = String(doctor.id);
				handleDoctorSelection(doctor.id);
			});
			doctorList.appendChild(button);
		});
	}

	async function loadDoctors() {
		try {
			const response = await fetch(`${API_BASE_URL}/doctors`);
			const doctors = await response.json();

			if (!response.ok) {
				renderStatusMessage(statusMsg, doctors.error || 'Could not load doctors.', 'err');
				return false;
			}

			state.doctors = doctors;
			doctorSelect.innerHTML = '<option value="">Choose a doctor</option>';

			doctors.forEach((doctor) => {
				const option = document.createElement('option');
				option.value = String(doctor.id);
				option.textContent = `${doctor.full_name} - ${doctor.specialty}`;
				doctorSelect.appendChild(option);
			});

			renderDoctorButtons();
			return true;
		} catch (error) {
			renderStatusMessage(statusMsg, 'Could not load doctors.', 'err');
			return false;
		}
	}

	function renderMonth(days) {
		monthGrid.innerHTML = '';

		days.forEach((day) => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `monthDay ${
				day.is_current_month ? 'currentMonth' : 'outsideMonth'
			} ${day.status === 'available' ? 'available' : 'unavailable'} ${
				day.iso_date === state.selectedDate ? 'selected' : ''
			}`;
			button.disabled = !day.is_current_month || day.status !== 'available';
			button.innerHTML = `
				<span class="monthDayNumber">${day.day_number}</span>
				<span class="monthDayMeta">${day.total_slots > 0 ? `${day.total_slots} slots` : 'No slots'}</span>
			`;

			if (!button.disabled) {
				button.addEventListener('click', () => {
					state.selectedDate = day.iso_date;
					state.selectedSlot = '';
					updateSummary();
					loadMonth();
					loadDaySlots();
				});
			}

			monthGrid.appendChild(button);
		});
	}

	function renderTimeSlots(slots) {
		timeSlotGrid.innerHTML = '';

		if (!slots || slots.length === 0) {
			timeSlotGrid.innerHTML = '<div class="emptyState">No slots available for this date.</div>';
			return;
		}

		slots.forEach((slot) => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `timeSlotButton${
				slot.label === state.selectedSlot ? ' selected' : ''
			}`;
			button.textContent = slot.label;
			button.addEventListener('click', () => {
				state.selectedSlot = slot.label;
				updateSummary();
				renderTimeSlots(slots);
			});
			timeSlotGrid.appendChild(button);
		});
	}

	async function loadMonth() {
		if (!state.selectedDoctorId) {
			monthGrid.innerHTML = '<div class="emptyState">Choose a doctor to view availability.</div>';
			timeSlotGrid.innerHTML = '<div class="emptyState">Choose a doctor first.</div>';
			monthLabel.textContent = 'Select a doctor';
			renderStatusMessage(statusMsg, 'Choose a doctor to load their calendar.');
			return;
		}

		const monthValue = formatIsoDate(state.currentMonth);

		try {
			const response = await fetch(
				`${API_BASE_URL}/calendar/month?doctorId=${encodeURIComponent(state.selectedDoctorId)}&month=${encodeURIComponent(monthValue)}`
			);
			const data = await response.json();

			if (!response.ok) {
				renderStatusMessage(statusMsg, data.error || 'Could not load monthly calendar.', 'err');
				return;
			}

			monthLabel.textContent = data.month_label;
			renderMonth(data.days);
			renderStatusMessage(statusMsg, `Showing ${data.doctor.full_name}'s availability.`, 'ok');

			if (
				!state.selectedDate ||
				!data.days.some((day) => day.iso_date === state.selectedDate && day.status === 'available')
			) {
				const firstAvailable = data.days.find((day) => day.is_current_month && day.status === 'available');
				state.selectedDate = firstAvailable ? firstAvailable.iso_date : '';
				state.selectedSlot = '';
				updateSummary();
				if (state.selectedDate) {
					await loadDaySlots();
				} else {
					renderTimeSlots([]);
				}
			}
		} catch (error) {
			renderStatusMessage(statusMsg, 'Could not load monthly calendar.', 'err');
		}
	}

	async function loadDaySlots() {
		if (!state.selectedDoctorId || !state.selectedDate) {
			renderTimeSlots([]);
			return;
		}

		try {
			const response = await fetch(
				`${API_BASE_URL}/calendar/day?doctorId=${encodeURIComponent(state.selectedDoctorId)}&date=${encodeURIComponent(state.selectedDate)}`
			);
			const data = await response.json();

			if (!response.ok) {
				renderStatusMessage(statusMsg, data.error || 'Could not load daily slots.', 'err');
				return;
			}

			renderTimeSlots(data.slots);
			updateSummary();
		} catch (error) {
			renderStatusMessage(statusMsg, 'Could not load daily slots.', 'err');
		}
	}

	async function handleDoctorSelection(doctorId) {
		state.selectedDoctorId = doctorId ? String(doctorId) : '';
		state.selectedDate = '';
		state.selectedSlot = '';
		renderDoctorButtons();
		updateSummary();
		await loadMonth();
	}

	doctorSelect.addEventListener('change', async () => {
		await handleDoctorSelection(doctorSelect.value);
	});

	monthPrevBtn.addEventListener('click', async () => {
		state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
		state.selectedDate = '';
		state.selectedSlot = '';
		updateSummary();
		await loadMonth();
	});

	monthNextBtn.addEventListener('click', async () => {
		state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
		state.selectedDate = '';
		state.selectedSlot = '';
		updateSummary();
		await loadMonth();
	});

	loadDoctors().then((loaded) => {
		if (!loaded || state.doctors.length === 0) {
			monthGrid.innerHTML = '<div class="emptyState">No doctors found.</div>';
			timeSlotGrid.innerHTML = '<div class="emptyState">No times available.</div>';
			return;
		}

		const firstDoctor = state.doctors[0];
		doctorSelect.value = String(firstDoctor.id);
		handleDoctorSelection(firstDoctor.id);
	});

	window.setInterval(() => {
		if (!state.selectedDoctorId) {
			return;
		}

		loadMonth();
	}, 30000);
}

function setupCalendarPage() {
	const calendarGrid = document.getElementById('calendarGrid');
	const doctorSelect = document.getElementById('doctorSelect');
	const weekStartInput = document.getElementById('weekStart');
	const refreshBtn = document.getElementById('refreshBtn');
	const statusMsg = document.getElementById('statusMsg');
	const hamburger = document.getElementById('hamburger');
	const sideMenu = document.getElementById('sideMenu');
	const closeMenuBtn = document.getElementById('closeMenuBtn');
	const menuOverlay = document.getElementById('menuOverlay');

	if (!calendarGrid || !weekStartInput || !refreshBtn || !statusMsg) {
		return;
	}

	const initialMonday = getMonday();
	weekStartInput.value = formatIsoDate(initialMonday);

	function openMenu() {
		sideMenu?.classList.add('open');
		menuOverlay?.classList.add('show');
	}

	function closeMenu() {
		sideMenu?.classList.remove('open');
		menuOverlay?.classList.remove('show');
	}

	hamburger?.addEventListener('click', openMenu);
	closeMenuBtn?.addEventListener('click', closeMenu);
	menuOverlay?.addEventListener('click', closeMenu);

	async function loadDoctorOptions() {
		if (!doctorSelect) {
			return true;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/doctors`);
			const doctors = await response.json();

			if (!response.ok) {
				renderStatusMessage(statusMsg, 'Could not load doctor filter list.', 'err');
				return;
			}

			doctorSelect.innerHTML = '<option value="">All doctors</option>';

			doctors.forEach((doctor) => {
				const option = document.createElement('option');
				option.value = String(doctor.id);
				option.textContent = `${doctor.full_name} - ${doctor.specialty}`;
				doctorSelect.appendChild(option);
			});
		} catch (error) {
			renderStatusMessage(statusMsg, 'Could not load doctor filter list.', 'err');
		}
	}

	function renderCalendar(data) {
		calendarGrid.style.setProperty('--cols', String((data.days?.length || 0) + 1));
		calendarGrid.innerHTML = '';

		const corner = document.createElement('div');
		corner.className = 'corner';
		corner.textContent = `Doctors (${data.doctors.length})`;
		calendarGrid.appendChild(corner);

		data.days.forEach((day) => {
			const header = document.createElement('div');
			header.className = 'colHeader';
			header.innerHTML = `<div>${day.label}</div><div class="small">${day.iso_date}</div>`;
			calendarGrid.appendChild(header);
		});

		data.doctors.forEach((doctor) => {
			const rowHeader = document.createElement('div');
			rowHeader.className = 'rowHeader';
			rowHeader.innerHTML = `
				<div class="docName">${doctor.full_name}</div>
				<div class="docMeta">${doctor.specialty} · Room ${doctor.room_number || 'TBC'}</div>
			`;
			calendarGrid.appendChild(rowHeader);

			doctor.availability.forEach((day) => {
				const cell = document.createElement('div');
				const heatClass = getHeatClass(day.total_slots);
				cell.className = `dayCell heat ${heatClass}`;
				cell.innerHTML = `
					<div class="count">${day.total_slots} available slot${day.total_slots === 1 ? '' : 's'}</div>
					<div class="times">${formatSlotSummary(day.slots)}</div>
				`;
				calendarGrid.appendChild(cell);
			});
		});
	}

	async function loadCalendar() {
		const weekStart = weekStartInput.value;
		const doctorId = doctorSelect?.value || '';
		if (!weekStart) {
			renderStatusMessage(statusMsg, 'Choose a valid Monday date first.', 'err');
			return;
		}

		renderStatusMessage(statusMsg, 'Loading weekly doctor availability...');

		try {
			const params = new URLSearchParams({ weekStart });
			if (doctorId) {
				params.set('doctorId', doctorId);
			}

			const response = await fetch(`${API_BASE_URL}/calendar/weekly?${params.toString()}`);
			const data = await response.json();

			if (!response.ok) {
				renderStatusMessage(statusMsg, data.error || 'Failed to load calendar.', 'err');
				return;
			}

			renderCalendar(data);
			const doctorText = doctorSelect?.selectedOptions[0]?.textContent || 'All doctors';
			renderStatusMessage(
				statusMsg,
				`Loaded ${doctorText} for ${data.week_start} to ${data.week_end}. Auto-refresh is on.`,
				'ok'
			);
		} catch (error) {
			renderStatusMessage(statusMsg, 'Could not connect to the calendar service.', 'err');
		}
	}

	refreshBtn.addEventListener('click', loadCalendar);
	doctorSelect?.addEventListener('change', loadCalendar);
	weekStartInput.addEventListener('change', loadCalendar);
	loadDoctorOptions().then(loadCalendar);
	window.setInterval(loadCalendar, 30000);
}

setupAuthPage();
setupNavigation();
setupMedicalRecordsPage();
setupHomeBookingDashboard();
setupCalendarPage();
