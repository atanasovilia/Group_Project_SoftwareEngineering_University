// Base URL of backend API.
const API_BASE_URL = 'http://localhost:3000';

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

document.getElementById("goAppointments")?.addEventListener("click", () => {
      window.location.href = "doctor.html";
    });

    document.getElementById("goCalendar")?.addEventListener("click", () => {
      window.location.href = "calendar.html";
    });

    document.getElementById("goRecords")?.addEventListener("click", () => {
      window.location.href = "records.html";
    });