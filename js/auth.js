class SimpleGistAuth {
    constructor() {
        // Master gist ID - this is PUBLIC so it's safe to have here
        this.MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
        
        // GitHub API base (for PUBLIC reads only)
        this.API_BASE = 'https://api.github.com/gists';
        
        // Netlify function endpoint (for PRIVATE writes)
        this.FUNCTION_URL = '/.netlify/functions/update-points';
        
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
            // READ master config - No token needed for public gists!
            const response = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch config: ${response.status}`);
            }
            
            const gist = await response.json();
            
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
            if (!config.students || !config.students[studentId]) {
                console.log('New student! Creating gist...');
                await this.createStudentGist(studentId);
            } else {
                console.log('Welcome back! Loading your data...');
                this.studentGistId = config.students[studentId];
                await this.loadStudentGist(studentId);
            }
            
            return true;
            
        } catch (error) {
            console.error('Authentication failed:', error);
            
            if (error.message === 'Invalid PIN') {
                alert('Invalid PIN. Please try again.');
            } else {
                alert('Authentication error. Please try again.');
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
            // CREATE gist through Netlify function (secure!)
            const response = await fetch(this.FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'createGist',
                    studentId: studentId,
                    updateData: studentData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create gist');
            }
            
            const newGist = await response.json();
            this.studentGistId = newGist.id;
            
            // Update master config with new student
            await this.updateMasterConfig(studentId, newGist.id);
            
            // Store locally
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            
            // Update UI
            this.updatePointsDisplay(studentData.points);
            
            // Show welcome message
            this.showPointsNotification(10, 'Welcome to CSCI 3403!');
            
            return studentData;
            
        } catch (error) {
            console.error('Error creating student gist:', error);
            
            // Fallback to local storage only
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            alert('Created local profile. Contact instructor if issues persist.');
            return studentData;
        }
    }
    
    async loadStudentGist(studentId) {
        try {
            // First, get the gist ID from master config (PUBLIC read)
            const masterResponse = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`);
            
            if (!masterResponse.ok) {
                throw new Error('Failed to fetch master config');
            }
            
            const masterGist = await masterResponse.json();
            const config = JSON.parse(masterGist.files['csci3403-config.json'].content);
            
            const gistId = config.students[studentId];
            if (!gistId) {
                console.log('No gist found for student');
                return null;
            }
            
            this.studentGistId = gistId;
            
            // READ student gist (public read, no token needed)
            const response = await fetch(`${this.API_BASE}/${gistId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch student data');
            }
            
            const gist = await response.json();
            const studentData = JSON.parse(gist.files['student-data.json'].content);
            
            // Calculate streak
            const now = new Date();
            const lastActive = new Date(studentData.lastActive);
            const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
            
            if (lastActive.toDateString() !== now.toDateString() && hoursSinceActive < 48) {
                studentData.streak = (studentData.streak || 0) + 1;
                console.log('Streak increased to:', studentData.streak);
            } else if (hoursSinceActive > 48) {
                studentData.streak = 1;
                console.log('Streak reset');
            }
            
            // Update last active
            studentData.lastActive = now.toISOString();
            
            // Store locally
            localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            
            // Update UI
            this.updatePointsDisplay(studentData.points);
            
            // Update the gist with new activity time (through Netlify)
            await this.updateStudentData(studentData);
            
            return studentData;
            
        } catch (error) {
            console.error('Error loading student gist:', error);
            
            // Fallback to local storage
            const localData = localStorage.getItem(`student_${studentId}`);
            if (localData) {
                this.currentProgress = JSON.parse(localData);
                this.updatePointsDisplay(this.currentProgress.points);
                return this.currentProgress;
            }
            return null;
        }
    }
    
    async updateStudentData(updates) {
        if (!this.currentStudent || !this.studentGistId) {
            console.error('No student data to update');
            return false;
        }
        
        // Merge updates with current data
        const studentData = { ...this.currentProgress, ...updates };
        studentData.lastActive = new Date().toISOString();
        
        try {
            // UPDATE through Netlify function (secure!)
            const response = await fetch(this.FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateStudent',
                    studentId: this.currentStudent.studentId,
                    gistId: this.studentGistId,
                    updateData: studentData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update gist');
            }
            
            // Update local storage
            localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            
            // Update UI
            this.updatePointsDisplay(studentData.points);
            
            console.log('Student data updated successfully');
            return true;
            
        } catch (error) {
            console.error('Error updating gist:', error);
            
            // Still update locally even if server fails
            localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            this.updatePointsDisplay(studentData.points);
            
            return false;
        }
    }
    
    async updateMasterConfig(studentId, gistId) {
        try {
            // UPDATE master config through Netlify function
            const response = await fetch(this.FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateMaster',
                    studentId: studentId,
                    gistId: gistId,
                    masterGistId: this.MASTER_GIST_ID
                })
            });
            
            if (!response.ok) {
                console.error('Failed to update master config');
            } else {
                console.log('Master config updated with new student');
            }
            
        } catch (error) {
            console.error('Error updating master config:', error);
        }
    }
    
    async awardPoints(points, reason) {
        if (!this.currentProgress) {
            console.error('No student data loaded');
            return false;
        }
        
        // Create activity record
        const activity = {
            type: 'points_awarded',
            points: points,
            reason: reason,
            timestamp: new Date().toISOString()
        };
        
        // Update points
        this.currentProgress.points += points;
        
        // Add activity to history
        if (!this.currentProgress.activities) {
            this.currentProgress.activities = [];
        }
        this.currentProgress.activities.push(activity);
        
        // Save updates
        const success = await this.updateStudentData(this.currentProgress);
        
        if (success) {
            // Show notification
            this.showPointsNotification(points, reason);
            console.log(`Awarded ${points} points for: ${reason}`);
        }
        
        return success;
    }
    
    async trackLectureView(lectureNumber, lectureTitle) {
        if (!this.currentProgress) return;
        
        const now = new Date().toISOString();
        let pointsAwarded = 0;
        
        // Check if first time viewing this lecture
        if (!this.currentProgress.viewedLectures[lectureNumber]) {
            this.currentProgress.viewedLectures[lectureNumber] = {
                title: lectureTitle,
                firstViewed: now,
                views: 1
            };
            pointsAwarded = 2; // Points for first view
            
            // Add activity
            if (!this.currentProgress.activities) {
                this.currentProgress.activities = [];
            }
            this.currentProgress.activities.push({
                type: 'lecture_viewed',
                lectureNumber: lectureNumber,
                points: pointsAwarded,
                timestamp: now,
                description: `First view of Lecture ${lectureNumber}: ${lectureTitle}`
            });
            
            this.currentProgress.points += pointsAwarded;
            
        } else {
            // Increment view count
            this.currentProgress.viewedLectures[lectureNumber].views++;
            this.currentProgress.viewedLectures[lectureNumber].lastViewed = now;
        }
        
        // Update gist
        await this.updateStudentData(this.currentProgress);
        
        if (pointsAwarded > 0) {
            this.showPointsNotification(pointsAwarded, `Viewed Lecture ${lectureNumber}`);
        }
    }
    
    showPointsNotification(points, reason) {
        // Create notification element
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
    
    updateUIForAuthenticated() {
        // Hide login form
        const loginEl = document.getElementById('auth-section');
        if (loginEl) loginEl.style.display = 'none';
        
        // Show user info
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
        localStorage.removeItem(`student_${this.currentStudent.studentId}`);
        location.reload();
    }
}

// Initialize on page load
let auth;
document.addEventListener('DOMContentLoaded', () => {
    auth = new SimpleGistAuth();
});

console.log('Auth.js loaded successfully - Netlify secure version');