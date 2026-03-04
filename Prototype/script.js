const API_BASE_URL = 'http://localhost:3000';

const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMsg = document.getElementById('authMsg');

function showMessage(text, isError = false) {
	if (!authMsg) {
		return;
	}

	authMsg.textContent = text;
	authMsg.style.color = isError ? '#b42318' : '#0f7a3e';
}

function switchTab(tabName) {
	tabs.forEach((tab) => {
		tab.classList.toggle('on', tab.dataset.tab === tabName);
	});

	if (tabName === 'login') {
		loginForm?.classList.remove('hidden');
		registerForm?.classList.add('hidden');
	} else {
		loginForm?.classList.add('hidden');
		registerForm?.classList.remove('hidden');
	}

	showMessage('');
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

registerForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const email = document.getElementById('regEmail')?.value?.trim();
	const password = document.getElementById('regPass')?.value;

	if (!email || !password) {
		showMessage('Please enter email and password.', true);
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
			showMessage(data.error || 'Registration failed.', true);
			return;
		}

		showMessage('Registration successful. You can now log in.');
		registerForm.reset();
		switchTab('login');
		const loginEmailInput = document.getElementById('loginEmail');
		if (loginEmailInput) {
			loginEmailInput.value = email;
		}
	} catch (error) {
		showMessage('Could not connect to server.', true);
	}
});

loginForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const email = document.getElementById('loginEmail')?.value?.trim();
	const password = document.getElementById('loginPass')?.value;

	if (!email || !password) {
		showMessage('Please enter email and password.', true);
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
			showMessage(data.error || 'Login failed.', true);
			return;
		}

		localStorage.setItem('authUser', JSON.stringify(data.user));
		showMessage('Login successful. Redirecting...');
		window.location.href = 'home.html';
	} catch (error) {
		showMessage('Could not connect to server.', true);
	}
});

switchTab('login');
