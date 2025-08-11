class PresentationController {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.slide');
        this.totalSlides = this.slides.length;
        this.timerInterval = null;
        this.currentTheme = localStorage.getItem('ocuTheme') || 'light';

        this.init();
    }

    init() {
        // Initialize theme FIRST before anything else
        this.initializeTheme();

        // Initialize slide counter display
        this.updateSlideCounter();

        // Show first slide
        this.showSlide(0);

        // Bind navigation buttons
        this.bindNavigationButtons();

        // Bind keyboard navigation
        this.bindKeyboardNavigation();

        // Initialize any timers if present
        this.initializeTimers();
    }

    initializeTheme() {
        // Apply saved theme immediately
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        // Always create theme toggle for lecture pages
        if (!document.querySelector('.theme-toggle')) {
            this.createThemeToggle();
        }

        // Wait a tick to ensure DOM is ready, then bind the toggle
        setTimeout(() => {
            const themeToggle = document.querySelector('#theme-checkbox');
            if (themeToggle) {
                themeToggle.checked = this.currentTheme === 'dark';
                themeToggle.removeEventListener('change', this.handleThemeChange);
                themeToggle.addEventListener('change', this.handleThemeChange.bind(this));
            }
        }, 0);
    }

    createThemeToggle() {
        const toggleHTML = `
            <div class="theme-toggle">
                <span class="theme-toggle-label">Light</span>
                <label class="theme-switch">
                    <input type="checkbox" id="theme-checkbox" ${this.currentTheme === 'dark' ? 'checked' : ''}>
                    <span class="theme-slider"></span>
                </label>
                <span class="theme-toggle-label">Dark</span>
            </div>
        `;
        
        // Insert at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', toggleHTML);
    }

    handleThemeChange(e) {
        this.currentTheme = e.target.checked ? 'dark' : 'light';
        this.applyTheme();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        
        // Update checkbox if it exists
        const checkbox = document.querySelector('#theme-checkbox');
        if (checkbox) {
            checkbox.checked = this.currentTheme === 'dark';
        }
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('ocuTheme', this.currentTheme);
    }

    showSlide(n) {
        // Hide current slide
        if (this.slides[this.currentSlide]) {
            this.slides[this.currentSlide].classList.remove('active');
        }

        // Calculate new slide index with wrapping
        this.currentSlide = (n + this.totalSlides) % this.totalSlides;

        // Show new slide
        this.slides[this.currentSlide].classList.add('active');

        // Update counter and button states
        this.updateSlideCounter();
        this.updateButtonStates();

        // Trigger slide change event for custom handlers
        this.triggerSlideChangeEvent();
    }

    changeSlide(direction) {
        this.showSlide(this.currentSlide + direction);
    }

    updateSlideCounter() {
        const currentSlideElement = document.getElementById('currentSlide');
        const totalSlidesElement = document.getElementById('totalSlides');

        if (currentSlideElement) {
            currentSlideElement.textContent = this.currentSlide + 1;
        }

        if (totalSlidesElement) {
            totalSlidesElement.textContent = this.totalSlides;
        }
    }

    updateButtonStates() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentSlide === this.totalSlides - 1;
        }
    }

    bindNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) {
            prevBtn.onclick = null;
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeSlide(-1);
            });
        }

        if (nextBtn) {
            nextBtn.onclick = null;
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeSlide(1);
            });
        }
    }

    bindKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    if (this.currentSlide > 0) {
                        this.changeSlide(-1);
                    }
                    break;

                case 'ArrowRight':
                    if (this.currentSlide < this.totalSlides - 1) {
                        this.changeSlide(1);
                    }
                    break;

                case ' ':
                    e.preventDefault();
                    if (this.currentSlide < this.totalSlides - 1) {
                        this.changeSlide(1);
                    }
                    break;

                case 'Home':
                    e.preventDefault();
                    this.showSlide(0);
                    break;

                case 'End':
                    e.preventDefault();
                    this.showSlide(this.totalSlides - 1);
                    break;

                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;

                case 't':
                case 'T':
                    e.preventDefault();
                    this.toggleTheme();
                    break;

                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    initializeTimers() {
        // Look for timer buttons and bind them
        const timerButtons = document.querySelectorAll('[data-timer]');
        timerButtons.forEach(button => {
            button.addEventListener('click', () => {
                const minutes = parseInt(button.dataset.timer);
                this.startTimer(minutes);
            });
        });
    }

    startTimer(minutes) {
        const timerDisplay = document.getElementById('timer-display');
        const timerText = document.getElementById('timer-text');

        if (!timerDisplay || !timerText) return;

        timerDisplay.style.display = 'block';
        let timeLeft = minutes * 60;

        // Clear existing timer if any
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerText.textContent = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                timerText.textContent = "Time's up!";
                this.playTimerSound();
            }

            timeLeft--;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.style.display = 'none';
        }
    }

    playTimerSound() {
        // Create a simple beep sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Could not play timer sound:', e);
        }
    }

    triggerSlideChangeEvent() {
        const event = new CustomEvent('slidechange', {
            detail: {
                currentSlide: this.currentSlide,
                totalSlides: this.totalSlides
            }
        });
        document.dispatchEvent(event);
    }

    // Public methods for external use
    getCurrentSlide() {
        return this.currentSlide;
    }

    getTotalSlides() {
        return this.totalSlides;
    }

    goToSlide(slideNumber) {
        if (slideNumber >= 0 && slideNumber < this.totalSlides) {
            this.showSlide(slideNumber);
        }
    }
}

// Initialize presentation controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.presentation = new PresentationController();
});

// Helper function for quick timer creation
function createTimer(minutes, message = 'Work Time') {
    const button = document.createElement('button');
    button.textContent = `Start ${minutes}-Minute Timer`;
    button.dataset.timer = minutes;
    button.style.marginTop = '20px';
    return button;
}

// Expose startTimer function globally for onclick attributes
function startTimer(minutes) {
    if (window.presentation) {
        window.presentation.startTimer(minutes);
    }
}

// Expose changeSlide function globally for onclick attributes  
function changeSlide(direction) {
    if (window.presentation) {
        window.presentation.changeSlide(direction);
    }
}