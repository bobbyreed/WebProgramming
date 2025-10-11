/**
 * Classroom Authentication System
 * Web Programming CSCI 3403 - Fall 2025
 * Instructor: bobby reed
 *
 * Card swipe authentication for attendance and registration pages
 * Session expires after 8 hours of inactivity
 */

const ClassroomAuth = (function() {
    // ==================== CONFIGURATION ====================
    // Update with your instructor card swipe pattern
    const INSTRUCTOR_CARD_PATTERN = 'REED/BOBBY';
    const AUTH_KEY = 'classroom_auth';
    const AUTH_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    // ==================== CORE FUNCTIONS ====================

    /**
     * Check if user is authenticated and session is still valid
     */
    function isAuthenticated() {
        const authData = localStorage.getItem(AUTH_KEY);
        if (!authData) return false;

        try {
            const { authenticated, timestamp } = JSON.parse(authData);
            const now = Date.now();
            const timeElapsed = now - timestamp;

            if (authenticated && timeElapsed < AUTH_TIMEOUT) {
                // Update timestamp to keep session alive
                updateAuthTimestamp();
                return true;
            } else {
                // Session expired
                clearAuth();
                return false;
            }
        } catch (e) {
            clearAuth();
            return false;
        }
    }

    /**
     * Update the timestamp to keep session alive
     */
    function updateAuthTimestamp() {
        const authData = localStorage.getItem(AUTH_KEY);
        if (authData) {
            try {
                const data = JSON.parse(authData);
                data.timestamp = Date.now();
                localStorage.setItem(AUTH_KEY, JSON.stringify(data));
            } catch (e) {
                console.error('Error updating auth timestamp:', e);
            }
        }
    }

    /**
     * Validate instructor card swipe
     */
    function validateCard(cardData) {
        // Check if card data contains the instructor pattern
        return cardData && cardData.includes(INSTRUCTOR_CARD_PATTERN);
    }

    /**
     * Set authentication status
     */
    function setAuth() {
        const authData = {
            authenticated: true,
            timestamp: Date.now(),
            instructor: INSTRUCTOR_CARD_PATTERN
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    }

    /**
     * Clear authentication
     */
    function clearAuth() {
        localStorage.removeItem(AUTH_KEY);
    }

    /**
     * Get time remaining in session
     */
    function getTimeRemaining() {
        const authData = localStorage.getItem(AUTH_KEY);
        if (!authData) return 0;

        try {
            const { timestamp } = JSON.parse(authData);
            const timeElapsed = Date.now() - timestamp;
            const timeRemaining = AUTH_TIMEOUT - timeElapsed;
            return Math.max(0, timeRemaining);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Format time remaining as hours:minutes
     */
    function formatTimeRemaining() {
        const ms = getTimeRemaining();
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}h ${minutes}m`;
    }

    // ==================== UI FUNCTIONS ====================

    /**
     * Initialize authentication UI
     * @param {Object} options - Configuration options
     * @param {string} options.pageName - Name of the page for display
     * @param {Function} options.onSuccess - Callback on successful auth
     */
    function initAuthUI(options = {}) {
        const { pageName = 'Page', onSuccess = null } = options;

        // Check if already authenticated
        if (isAuthenticated()) {
            showAuthenticatedState(onSuccess);
            return;
        }

        // Show authentication form
        showAuthForm(pageName, onSuccess);
    }

    /**
     * Show authentication form
     */
    function showAuthForm(pageName, onSuccess) {
        const authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.innerHTML = `
            <div class="auth-overlay">
                <div class="auth-modal">
                    <h2>🔒 Instructor Authentication Required</h2>
                    <p>This page requires instructor authentication.</p>
                    <p class="auth-instruction">Please swipe your instructor card to continue.</p>

                    <div class="card-input-container">
                        <input type="text"
                               id="card-swipe-input"
                               placeholder="Swipe card here..."
                               autocomplete="off"
                               autofocus>
                    </div>

                    <div class="auth-info">
                        <p><strong>Page:</strong> ${pageName}</p>
                        <p><strong>Session Duration:</strong> 8 hours</p>
                    </div>

                    <div id="auth-error" class="auth-error" style="display: none;"></div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .auth-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .auth-modal {
                background: var(--bg-primary, white);
                color: var(--text-primary, #333);
                padding: 40px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            }

            .auth-modal h2 {
                margin-top: 0;
                color: var(--ocu-true-blue, #00447c);
            }

            .auth-instruction {
                font-weight: bold;
                color: var(--ocu-cyan, #00bfdf);
                margin: 20px 0;
            }

            .card-input-container {
                margin: 30px 0;
            }

            #card-swipe-input {
                width: 100%;
                padding: 15px;
                font-size: 16px;
                border: 2px solid var(--ocu-cyan, #00bfdf);
                border-radius: 5px;
                box-sizing: border-box;
                background: var(--bg-secondary, #f8f9fa);
                color: var(--text-primary, #333);
            }

            #card-swipe-input:focus {
                outline: none;
                border-color: var(--ocu-true-blue, #00447c);
                box-shadow: 0 0 10px rgba(0, 191, 223, 0.3);
            }

            .auth-info {
                background: var(--bg-secondary, #f8f9fa);
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }

            .auth-info p {
                margin: 5px 0;
            }

            .auth-error {
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
                border: 1px solid #f5c6cb;
            }

            .auth-success-banner {
                background: #d4edda;
                color: #155724;
                padding: 15px 20px;
                border-radius: 5px;
                margin: 20px 0;
                border: 1px solid #c3e6cb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .auth-success-banner button {
                background: #155724;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }

            .auth-success-banner button:hover {
                background: #0f4419;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(authContainer);

        // Handle card swipe
        const cardInput = document.getElementById('card-swipe-input');
        const errorDiv = document.getElementById('auth-error');

        cardInput.addEventListener('change', function() {
            const cardData = this.value.trim();

            if (validateCard(cardData)) {
                setAuth();
                authContainer.remove();
                showAuthenticatedState(onSuccess);
            } else {
                errorDiv.textContent = '❌ Invalid card. Please use an instructor card.';
                errorDiv.style.display = 'block';
                this.value = '';

                // Hide error after 3 seconds
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 3000);
            }
        });
    }

    /**
     * Show authenticated state banner
     */
    function showAuthenticatedState(onSuccess) {
        // Remove any existing banner
        const existingBanner = document.getElementById('auth-success-banner');
        if (existingBanner) existingBanner.remove();

        // Create success banner
        const banner = document.createElement('div');
        banner.id = 'auth-success-banner';
        banner.className = 'auth-success-banner';
        banner.innerHTML = `
            <div>
                <strong>✅ Authenticated</strong> - Session expires in ${formatTimeRemaining()}
            </div>
            <button onclick="ClassroomAuth.logout()">Logout</button>
        `;

        // Insert at top of body
        document.body.insertBefore(banner, document.body.firstChild);

        // Call success callback
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
        }

        // Update timer every minute
        const timer = setInterval(() => {
            if (isAuthenticated()) {
                const timeDiv = banner.querySelector('div');
                if (timeDiv) {
                    timeDiv.innerHTML = `<strong>✅ Authenticated</strong> - Session expires in ${formatTimeRemaining()}`;
                }
            } else {
                clearInterval(timer);
                banner.remove();
                location.reload();
            }
        }, 60000); // Update every minute
    }

    /**
     * Logout and reload page
     */
    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            clearAuth();
            location.reload();
        }
    }

    // ==================== PUBLIC API ====================

    return {
        isAuthenticated,
        initAuthUI,
        logout,
        validateCard,
        getTimeRemaining,
        formatTimeRemaining
    };
})();

// Make available globally
window.ClassroomAuth = ClassroomAuth;
