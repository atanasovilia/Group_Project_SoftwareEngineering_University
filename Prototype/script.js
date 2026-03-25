const API_BASE_URL = window.location.origin;

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

// Cache common DOM references used by auth UI.
const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMsg = document.getElementById('authMsg');

// Displays a status message to the user.
// isError=true shows error color, false shows success color.
function showMessage(text, isError = false) {
	if (!authMsg) {
		return;
	}

	authMsg.textContent = text;
	authMsg.style.color = isError ? '#b42318' : '#0f7a3e';
}

// Switches between login and register forms.
function switchTab(tabName) {
	// Toggle active tab styling.
	tabs.forEach((tab) => {
		tab.classList.toggle('on', tab.dataset.tab === tabName);
	});

	// Show one form and hide the other.
	if (tabName === 'login') {
		loginForm?.classList.remove('hidden');
		registerForm?.classList.add('hidden');
	} else {
		loginForm?.classList.add('hidden');
		registerForm?.classList.remove('hidden');
	}

	// Clear previous status message when switching context.
	showMessage('');
}

// Tab button click handlers.
tabs.forEach((tab) => {
	tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Password visibility toggles for both forms.
document.querySelectorAll('.togglePass').forEach((button) => {
	button.addEventListener('click', () => {
		const input = button.parentElement?.querySelector('input');
		if (!input) {
			return;
		}

		// Swap between hidden and visible password text.
		input.type = input.type === 'password' ? 'text' : 'password';
	});
});

// Register form submit handler.
// Sends new user details to backend /register endpoint.
registerForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	// Read user input values.
	const email = document.getElementById('regEmail')?.value?.trim();
	const password = document.getElementById('regPass')?.value;

	// Basic input check.
	if (!email || !password) {
		showMessage('Please enter email and password.', true);
		return;
	}

	// Create a simple display name from email prefix.
	const generatedName = email.split('@')[0] || 'user';

	try {
		// Call backend register endpoint.
		const response = await fetch(`${API_BASE_URL}/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: generatedName,
				email,
				password,
			}),
		});

		// Parse JSON response body.
		const data = await response.json();

		// Show API error if request failed.
		if (!response.ok) {
			showMessage(data.error || 'Registration failed.', true);
			return;
		}

		// Success UX: notify user and move to login tab.
		showMessage('Registration successful. You can now log in.');
		registerForm.reset();
		switchTab('login');
		// Pre-fill login email for convenience.
		const loginEmailInput = document.getElementById('loginEmail');
		if (loginEmailInput) {
			loginEmailInput.value = email;
		}
	} catch (error) {
		// Network or server unreachable.
		showMessage('Could not connect to server.', true);
	}
});

// Login form submit handler.
// Authenticates against backend /login endpoint.
loginForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	// Read user credentials.
	const email = document.getElementById('loginEmail')?.value?.trim();
	const password = document.getElementById('loginPass')?.value;

	// Basic input check.
	if (!email || !password) {
		showMessage('Please enter email and password.', true);
		return;
	}

	try {
		// Call backend login endpoint.
		const response = await fetch(`${API_BASE_URL}/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});

		// Parse JSON response body.
		const data = await response.json();

		// Show API error if login fails.
		if (!response.ok) {
			showMessage(data.error || 'Login failed.', true);
			return;
		}

		// Save logged-in user info locally for session-like UX.
		localStorage.setItem('authUser', JSON.stringify(data.user));
		showMessage('Login successful. Redirecting...');
		// Navigate to authenticated landing page.
		window.location.href = 'home.html';
	} catch (error) {
		// Network or server unreachable.
		showMessage('Could not connect to server.', true);
	}
});

// Default view when page first loads.
switchTab('login');

document.querySelectorAll('.logout-btn').forEach((button) => {
	button.addEventListener('click', logoutUser);
});

document.getElementById("goAppointments")?.addEventListener("click", () => {
      window.location.href = "doctor.html";
    });

    document.getElementById("goCalendar")?.addEventListener("click", () => {
      window.location.href = "calendar.html";
    });

document.getElementById("goRecords")?.addEventListener("click", () => {
      window.location.href = "records.html";
    });

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

setupHomeBookingDashboard();
setupCalendarPage();
