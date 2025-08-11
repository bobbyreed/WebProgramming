class SimpleGistAuth {
    constructor() {
        this.MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
        this.API_BASE = 'https://api.github.com/gists';
        
        //key for creating gists
        this.GITHUB_TOKEN = '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';
        
        // Check if already authenticated
        this.checkAuthStatus();
    }
    
    checkAuthStatus() {
        const authData = localStorage.getItem('csci3403_auth');
        if (authData) {
            this.currentStudent = JSON.parse(authData);
            this.updateUIForAuthenticated();
            // Load their gist data
            this.loadStudentGist(this.currentStudent.studentId);
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
            
            // Check if student has a gist, create if not
            if (!config.students[studentId]) {
                console.log('New student! Creating gist...');
                await this.createStudentGist(studentId);
            } else {
                console.log('Welcome back! Loading your data...');
                await this.loadStudentGist(studentId);
            }
            
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }
    
    async createStudentGist(studentId) {
        const studentData = {
            studentId: studentId,
            name: studentId, // They can update this later
            joinedDate: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            points: 10, // Welcome bonus!
            viewedLectures: {},
            achievements: ['🆕'], // New student badge
            streak: 1,
            activities: [
                {
                    type: 'joined_class',
                    points: 10,
                    timestamp: new Date().toISOString(),
                    description: 'Welcome to CSCI 3403!'
                }
            ]
        };
        
        try {
            // Create the student's gist
            const response = await fetch(this.API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    description: `CSCI 3403 - Student Data - ${studentId}`,
                    public: false, // Keep student data private
                    files: {
                        'student-data.json': {
                            content: JSON.stringify(studentData, null, 2)
                        }
                    }
                })
            });
            
            if (!response.ok) throw new Error('Failed to create gist');
            
            const newGist = await response.json();
            
            // Update master config with new student's gist ID
            await this.updateMasterConfig(studentId, newGist.id);
            
            // Store locally
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            
            console.log('Student gist created successfully!');
            return studentData;
            
        } catch (error) {
            console.error('Error creating student gist:', error);
            // Fallback to local storage only
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            return studentData;
        }
    }
    
    async loadStudentGist(studentId) {
        try {
            // Get the master config first
            const masterResponse = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`);
            const masterGist = await masterResponse.json();
            const config = JSON.parse(masterGist.files['csci3403-config.json'].content);
            
            const gistId = config.students[studentId];
            if (!gistId) {
                console.log('No gist found for student');
                return null;
            }
            
            // Fetch the student's gist
            const response = await fetch(`${this.API_BASE}/${gistId}`);
            const gist = await response.json();
            const studentData = JSON.parse(gist.files['student-data.json'].content);
            
            // Update last active
            studentData.lastActive = new Date().toISOString();
            
            // Check streak
            const lastActive = new Date(studentData.lastActive);
            const now = new Date();
            const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
            
            if (hoursSinceActive > 48) {
                studentData.streak = 0; // Reset streak if gone more than 2 days
            }
            
            // Store locally and in memory
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            this.studentGistId = gistId;
            
            // Update UI with points
            this.updatePointsDisplay(studentData.points);
            
            return studentData;
            
        } catch (error) {
            console.error('Error loading student gist:', error);
            // Fallback to local storage
            const localData = localStorage.getItem(`student_${studentId}`);
            return localData ? JSON.parse(localData) : null;
        }
    }
    
    async updateStudentData(updates) {
        if (!this.currentStudent || !this.studentGistId) return;
        
        const studentData = this.currentProgress;
        
        // Merge updates
        Object.assign(studentData, updates);
        studentData.lastActive = new Date().toISOString();
        
        try {
            const response = await fetch(`${this.API_BASE}/${this.studentGistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    files: {
                        'student-data.json': {
                            content: JSON.stringify(studentData, null, 2)
                        }
                    }
                })
            });
            
            if (!response.ok) throw new Error('Failed to update gist');
            
            // Update local storage
            localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            
            // Update UI
            this.updatePointsDisplay(studentData.points);
            
            console.log('Student data updated!');
            return true;
            
        } catch (error) {
            console.error('Error updating gist:', error);
            // Still update locally
            localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(studentData));
            return false;
        }
    }
    
    async awardPoints(points, reason) {
        if (!this.currentProgress) return;
        
        const activity = {
            type: 'points_awarded',
            points: points,
            reason: reason,
            timestamp: new Date().toISOString()
        };
        
        this.currentProgress.points += points;
        this.currentProgress.activities.push(activity);
        
        await this.updateStudentData(this.currentProgress);
        
        // Show notification
        this.showPointsNotification(points, reason);
    }
    
    showPointsNotification(points, reason) {
        // Create a fun notification
        const notification = document.createElement('div');
        notification.className = 'points-notification';
        notification.innerHTML = `
            <div style="font-size: 2em;">+${points} Points!</div>
            <div style="font-size: 1em; opacity: 0.8;">${reason}</div>
        `;
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => notification.remove(), 3000);
    }
    
    async updateMasterConfig(studentId, gistId) {
        try {
            // Get current config
            const response = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`);
            const gist = await response.json();
            const config = JSON.parse(gist.files['csci3403-config.json'].content);
            
            // Add new student
            config.students[studentId] = gistId;
            config.lastUpdated = new Date().toISOString();
            
            // Update master gist
            await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    files: {
                        'csci3403-config.json': {
                            content: JSON.stringify(config, null, 2)
                        }
                    }
                })
            });
            
            console.log('Master config updated with new student');
        } catch (error) {
            console.error('Error updating master config:', error);
        }
    }
    
    updateUIForAuthenticated() {
        // Hide login, show user info
        const loginEl = document.getElementById('auth-section');
        if (loginEl) loginEl.style.display = 'none';
        
        const userEl = document.getElementById('user-info');
        if (userEl) {
            userEl.style.display = 'block';
            userEl.innerHTML = `
                <span>Student: ${this.currentStudent.studentId}</span>
                <span id="points-display" style="
                    background: var(--ocu-green);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                ">Loading...</span>
                <button onclick="auth.logout()">Logout</button>
            `;
        }
    }
    
    updatePointsDisplay(points) {
        const pointsEl = document.getElementById('points-display');
        if (pointsEl) {
            pointsEl.textContent = `${points} Points`;
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