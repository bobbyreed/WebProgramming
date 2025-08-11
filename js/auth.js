class SimpleGistAuth {
    constructor() {
        this.MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
        this.API_BASE = 'https://api.github.com/gists';
        
        // Check if already authenticated
        this.checkAuthStatus();
    }
    
    checkAuthStatus() {
        const authData = localStorage.getItem('csci3403_auth');
        if (authData) {
            this.currentStudent = JSON.parse(authData);
            this.updateUIForAuthenticated();
            return true;
        }
        return false;
    }
    
    async authenticate(studentId, pin) {
        try {
            // Fetch master config to verify PIN
            const response = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`);
            const gist = await response.json();
            const config = JSON.parse(gist.files['csci3403-config.json'].content);
            
            // Verify PIN
            if (config.classPin !== pin) {
                throw new Error('Invalid PIN');
            }
            
            // Store authentication
            const authData = {
                studentId: studentId,
                authenticated: true,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('csci3403_auth', JSON.stringify(authData));
            this.currentStudent = authData;
            
            // Initialize progress tracking
            this.initializeProgress(studentId);
            
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }
    
    initializeProgress(studentId) {
        // Check if progress exists
        let progress = localStorage.getItem(`progress_${studentId}`);
        
        if (!progress) {
            progress = {
                studentId: studentId,
                points: 0,
                viewedLectures: {},
                firstLogin: new Date().toISOString(),
                lastActive: new Date().toISOString()
            };
            localStorage.setItem(`progress_${studentId}`, JSON.stringify(progress));
        }
        
        this.currentProgress = JSON.parse(localStorage.getItem(`progress_${studentId}`));
    }
    
    updateUIForAuthenticated() {
        // Hide login, show uesr info
        const loginEl = document.getElementById('auth-section');
        if (loginEl) loginEl.style.display = 'none';
        
        const userEl = document.getElementById('user-info');
        if (userEl) {
            userEl.style.display = 'block';
            userEl.innerHTML = `
                <span>Student: ${this.currentStudent.studentId}</span>
                <button onclick="auth.logout()">Logout</button>
            `;
        }
    }
    
    logout() {
        localStorage.removeItem('csci3403_auth');
        location.reload();
    }
}

// Initialize on page load
let auth;
document.addEventListener('DOMContentLoaded', () => {
    auth = new SimpleGistAuth();
});