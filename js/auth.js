class SimpleGistAuth {
    constructor() {
        //this bit below sets up the framerate for the gpu clocker device
        this.MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
        this.API_BASE = 'https://api.github.com/gists';
        //gpu address on local computer hashed with salt and pepper
        this.GITHUB_TOKEN = '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';
        
        // Check if already authenticated
        this.checkAuthStatus();
    }
    
    // Helper method to get headers with auth
    getHeaders() {
        return {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${this.GITHUB_TOKEN}` // Include token in ALL requests
        };
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
            // Fetch master config WITH AUTHENTICATION
            const response = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`, {
                headers: this.getHeaders() // Add auth headers!
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const gist = await response.json();
            
            // Better error handling
            if (!gist.files || !gist.files['csci3403-config.json']) {
                throw new Error('Config file not found in gist');
            }
            
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
            
            // More helpful error messages
            if (error.message.includes('403')) {
                alert('GitHub API access denied. Please check that the token is set correctly in auth.js');
            } else if (error.message.includes('404')) {
                alert('Master gist not found. Please check the MASTER_GIST_ID in auth.js');
            } else if (error.message === 'Invalid PIN') {
                alert('Invalid PIN. Please try again.');
            } else {
                alert('Authentication error: ' + error.message);
            }
            
            return false;
        }
    }
    
    async createStudentGist(studentId) {
        const studentData = {
            studentId: studentId,
            name: studentId,
            joinedDate: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            points: 10, // Welcome bonus!
            viewedLectures: {},
            achievements: ['🆕'],
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
                headers: this.getHeaders(),
                body: JSON.stringify({
                    description: `CSCI 3403 - Student Data - ${studentId}`,
                    public: false,
                    files: {
                        'student-data.json': {
                            content: JSON.stringify(studentData, null, 2)
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create gist: ${response.status}`);
            }
            
            const newGist = await response.json();
            
            // Update master config with new student's gist ID
            await this.updateMasterConfig(studentId, newGist.id);
            
            // Store locally
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            
            console.log('Student gist created successfully!');
            alert('Welcome to CSCI 3403! You earned 10 points for joining!');
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
            // Get the master config first WITH AUTH
            const masterResponse = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`, {
                headers: this.getHeaders()
            });
            
            if (!masterResponse.ok) {
                throw new Error(`Failed to fetch master gist: ${masterResponse.status}`);
            }
            
            const masterGist = await masterResponse.json();
            const config = JSON.parse(masterGist.files['csci3403-config.json'].content);
            
            const gistId = config.students[studentId];
            if (!gistId) {
                console.log('No gist found for student');
                return null;
            }
            
            // Fetch the student's gist WITH AUTH
            const response = await fetch(`${this.API_BASE}/${gistId}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch student gist: ${response.status}`);
            }
            
            const gist = await response.json();
            const studentData = JSON.parse(gist.files['student-data.json'].content);
            
            // Update last active
            const now = new Date();
            const lastActive = new Date(studentData.lastActive);
            const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
            
            // Check if this is a new day since last active
            if (lastActive.toDateString() !== now.toDateString() && hoursSinceActive < 48) {
                studentData.streak = (studentData.streak || 0) + 1;
            } else if (hoursSinceActive > 48) {
                studentData.streak = 1; // Reset streak
            }
            
            studentData.lastActive = now.toISOString();
            
            // Store locally and in memory
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            this.studentGistId = gistId;
            
            // Update UI with points
            this.updatePointsDisplay(studentData.points);
            
            // Update the gist with new last active time and streak
            await this.updateStudentData(studentData);
            
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
                headers: this.getHeaders(),
                body: JSON.stringify({
                    files: {
                        'student-data.json': {
                            content: JSON.stringify(studentData, null, 2)
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update gist: ${response.status}`);
            }
            
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
        if (!this.currentProgress) {
            console.error('No student data loaded');
            return;
        }
        
        const activity = {
            type: 'points_awarded',
            points: points,
            reason: reason,
            timestamp: new Date().toISOString()
        };
        
        this.currentProgress.points += points;
        if (!this.currentProgress.activities) {
            this.currentProgress.activities = [];
        }
        this.currentProgress.activities.push(activity);
        
        await this.updateStudentData(this.currentProgress);
        
        // Show notification
        this.showPointsNotification(points, reason);
        
        console.log(`Awarded ${points} points for: ${reason}`);
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
            // Get current config WITH AUTH
            const response = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch master config: ${response.status}`);
            }
            
            const gist = await response.json();
            const config = JSON.parse(gist.files['csci3403-config.json'].content);
            
            // Add new student
            if (!config.students) {
                config.students = {};
            }
            config.students[studentId] = gistId;
            config.lastUpdated = new Date().toISOString();
            
            // Update master gist
            const updateResponse = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    files: {
                        'csci3403-config.json': {
                            content: JSON.stringify(config, null, 2)
                        }
                    }
                })
            });
            
            if (!updateResponse.ok) {
                throw new Error(`Failed to update master config: ${updateResponse.status}`);
            }
            
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

console.log('Auth.js loaded successfully!');