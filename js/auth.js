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
    async authenticate(studentId, pin) {
    console.log('🔵 Starting authentication for:', studentId);
    
    try {
        console.log('🔵 Fetching master gist...');
        const response = await fetch(`${this.API_BASE}/${this.MASTER_GIST_ID}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch config: ${response.status}`);
        }
        
        const gist = await response.json();
        const config = JSON.parse(gist.files['csci3403-config.json'].content);
        
        // DEBUG: Check PIN details
        console.log('🔍 PIN Debug Info:');
        console.log('  Config PIN exists?', !!config.classPin);
        console.log('  Config PIN type:', typeof config.classPin);
        console.log('  Config PIN length:', config.classPin?.length);
        console.log('  Provided PIN:', pin);
        console.log('  Provided PIN type:', typeof pin);
        console.log('  Provided PIN length:', pin?.length);
        console.log('  PINs match?', config.classPin === pin);
        
        // Try type conversion just in case
        const configPin = String(config.classPin).trim();
        const providedPin = String(pin).trim();
        console.log('  After string conversion match?', configPin === providedPin);
        
        // Verify PIN
        if (config.classPin !== pin) {
            console.error('❌ PIN mismatch');
            throw new Error('Invalid PIN');
        }
        
        console.log('✅ PIN verified!');
        
        // Continue with rest of authentication...
        const authData = {
            studentId: studentId,
            authenticated: true,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('csci3403_auth', JSON.stringify(authData));
        this.currentStudent = authData;
        
        this.updateUIForAuthenticated();
        
        // Check if student exists
        if (!config.students || !config.students[studentId]) {
            console.log('🆕 New student - creating gist...');
            await this.createStudentGist(studentId);
        } else {
            console.log('📚 Existing student - loading data...');
            this.studentGistId = config.students[studentId];
            await this.loadStudentGist(studentId);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        
        if (error.message === 'Invalid PIN') {
            alert('Invalid PIN. Please try again.');
        } else {
            alert('Authentication error. Please try again.');
        }
        
        return false;
    }
}

    
    // Helper method to get lecture number from current page
    getLectureNumberFromPage() {
            // Try from body data attribute
            if (document.body.dataset.lectureNumber) {
                return parseInt(document.body.dataset.lectureNumber);
            }
            
            // Try from URL
            const path = window.location.pathname;
            const match = path.match(/(\d+)/);
            if (match) return parseInt(match[1]);
            
            // Try from title
            const title = document.title || document.querySelector('h1')?.textContent || '';
            const titleMatch = title.match(/Lecture\s*(\d+)/i);
            if (titleMatch) return parseInt(titleMatch[1]);
            
            return null;
        }
    
    checkAuthStatus() {
        const authData = localStorage.getItem('csci3403_auth');
        if (window.location.pathname.includes('pages/') && window.location.pathname.includes('.html')) {
        // We're on a lecture page, initialize enhanced tracking
        setTimeout(() => {
            if (window.LectureTracker) {
                // Use the separate tracker if loaded
                return;
            }
            // Otherwise use the enhanced method
            const lectureNumber = this.getLectureNumberFromPage();
            if (lectureNumber) {
                const lectureTitle = document.querySelector('h1')?.textContent || `Lecture ${lectureNumber}`;
                
                // Start tracking with 30 second delay
                setTimeout(() => {
                    this.trackLectureViewEnhanced(lectureNumber, lectureTitle);
                }, 30000);
            }
        }, 1000);
        }
    
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
            
            // IMPORTANT: Update UI immediately after storing auth
            this.updateUIForAuthenticated();
            
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

    // Test authentication directly
    async testAuth(studentId, pin) {
        console.log('Testing with:', { studentId, pin });
        
        // Direct test
        const response = await fetch('https://api.github.com/gists/0d1ed1373d1b88183b2e94542bbbad1f');
        const gist = await response.json();
        const config = JSON.parse(gist.files['csci3403-config.json'].content);
        
        console.log('Config PIN:', config.classPin);
        console.log('Your PIN:', pin);
        console.log('Match?', config.classPin === pin);
        
        // Now try actual auth
        if (window.authManager) {
            return await window.authManager.authenticate(studentId, pin);
        }
}
    async getPinHint() {
    fetch('https://api.github.com/gists/0d1ed1373d1b88183b2e94542bbbad1f')
      .then(r => r.json())
      .then(data => {
        const config = JSON.parse(data.files['csci3403-config.json'].content);
        const pin = config.classPin;
        
        // Create a hint
        console.log('🔐 PIN Hint:');
        console.log(`  First character: ${pin[0]}`);
        console.log(`  Last character: ${pin[pin.length - 1]}`);
        console.log(`  Length: ${pin.length} characters`);
        console.log(`  Character types: ${/^\d+$/.test(pin) ? 'numbers only' : 'mixed'}`);
        
        // Fun encoded version
        const encoded = btoa(pin);
        console.log(`  Encoded (for emergencies): ${encoded}`);
        console.log(`  To decode: atob('${encoded}')`);
      });
        }

// Use it like: testAuth('testuser', 'YOUR_PIN_HERE')
    
    async updateStudentData(data) {
        const response = await fetch(this.FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateStudent',
                studentId: this.currentStudent.studentId,
                updateData: data
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local state
            localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(data));
            // Don't need gist IDs, server handles everything
        }
        
        return result.success;
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

    async trackLectureViewEnhanced(lectureNumber, lectureTitle, options = {}) {
    if (!this.currentProgress) {
        console.error('No student data loaded');
        return false;
    }
    
    const now = new Date().toISOString();
    const {
        minViewTime = 30,  // seconds
        pointsFirstView = 10,
        pointsCompletion = 5,
        slideProgress = null
    } = options;
    
    // Initialize structures if needed
    if (!this.currentProgress.viewedLectures) {
        this.currentProgress.viewedLectures = {};
    }
    if (!this.currentProgress.activities) {
        this.currentProgress.activities = [];
    }
    if (!this.currentProgress.achievements) {
        this.currentProgress.achievements = [];
    }
    
    let pointsAwarded = 0;
    let activityDescription = '';
    
    // Check if first time viewing this lecture
    const lectureData = this.currentProgress.viewedLectures[lectureNumber];
    
    if (!lectureData) {
        // First time viewing
        this.currentProgress.viewedLectures[lectureNumber] = {
            title: lectureTitle,
            firstViewed: now,
            lastViewed: now,
            views: 1,
            completed: true,  // Mark as completed after min view time
            totalViewTime: minViewTime
        };
        
        pointsAwarded = pointsFirstView;
        activityDescription = `First complete view of Lecture ${lectureNumber}: ${lectureTitle}`;
        
    } else if (!lectureData.completed) {
        // Completing a previously started lecture
        lectureData.completed = true;
        lectureData.lastViewed = now;
        lectureData.views++;
        lectureData.totalViewTime = (lectureData.totalViewTime || 0) + minViewTime;
        
        pointsAwarded = pointsCompletion;
        activityDescription = `Completed Lecture ${lectureNumber}: ${lectureTitle}`;
        
    } else {
        // Re-viewing a completed lecture
        lectureData.views++;
        lectureData.lastViewed = now;
        lectureData.totalViewTime = (lectureData.totalViewTime || 0) + minViewTime;
    }
    
    // Update slide progress if provided
    if (slideProgress) {
        if (!this.currentProgress.slideProgress) {
            this.currentProgress.slideProgress = {};
        }
        this.currentProgress.slideProgress[lectureNumber] = slideProgress;
    }
    
    // Award points and log activity
    if (pointsAwarded > 0) {
        this.currentProgress.points = (this.currentProgress.points || 0) + pointsAwarded;
        
        this.currentProgress.activities.unshift({
            type: 'lecture_viewed',
            lectureNumber: lectureNumber,
            lectureTitle: lectureTitle,
            points: pointsAwarded,
            timestamp: now,
            description: activityDescription
        });
        
        // Keep only last 100 activities
        if (this.currentProgress.activities.length > 100) {
            this.currentProgress.activities = this.currentProgress.activities.slice(0, 100);
        }
        
        // Check for achievement milestones
        this.checkLectureAchievements();
    }
    
    // Update the student's gist
    const success = await this.updateStudentData(this.currentProgress);
    
    if (success && pointsAwarded > 0) {
        // Show enhanced notification
        this.showEnhancedPointsNotification(pointsAwarded, lectureTitle, !lectureData);
    }
    
    return success;
}

// Add achievement checking
checkLectureAchievements() {
    const lectureCount = Object.keys(this.currentProgress.viewedLectures || {}).length;
    const achievements = this.currentProgress.achievements || [];
    let newAchievements = [];
    
    const milestones = [
        { count: 1, id: 'first_lecture', name: 'First Steps', points: 5 },
        { count: 5, id: 'getting_started', name: 'Getting Started', points: 10 },
        { count: 10, id: 'dedicated_learner', name: 'Dedicated Learner', points: 20 },
        { count: 15, id: 'halfway_there', name: 'Halfway There', points: 30 },
        { count: 20, id: 'consistent_student', name: 'Consistent Student', points: 40 },
        { count: 25, id: 'almost_done', name: 'Almost Done', points: 50 },
        { count: 30, id: 'course_complete', name: 'Course Complete!', points: 100 }
    ];
    
    milestones.forEach(milestone => {
        if (lectureCount >= milestone.count && !achievements.includes(milestone.id)) {
            achievements.push(milestone.id);
            this.currentProgress.points = (this.currentProgress.points || 0) + milestone.points;
            newAchievements.push(milestone);
            
            // Log achievement activity
            this.currentProgress.activities.unshift({
                type: 'achievement_earned',
                achievementId: milestone.id,
                achievementName: milestone.name,
                points: milestone.points,
                timestamp: new Date().toISOString(),
                description: `Earned achievement: ${milestone.name}`
            });
        }
    });
    
    this.currentProgress.achievements = achievements;
    
    // Show achievement notifications
    newAchievements.forEach(achievement => {
        setTimeout(() => {
            this.showAchievementNotification(achievement.name, achievement.points);
        }, 500);
    });
}

// Enhanced notification with better visuals
showEnhancedPointsNotification(points, lectureTitle, isFirstView) {
    // Remove any existing notifications
    document.querySelectorAll('.lecture-completion-notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'lecture-completion-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${isFirstView ? '🎉' : '✅'}</div>
            <div class="notification-text">
                <div class="notification-title">
                    ${isFirstView ? 'Lecture Completed!' : 'Lecture Reviewed!'}
                </div>
                <div class="notification-points">+${points} Points</div>
                <div class="notification-subtitle">${lectureTitle}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Update points display with animation
    const pointsDisplay = document.getElementById('points-display');
    if (pointsDisplay) {
        pointsDisplay.classList.add('points-added');
        this.updatePointsDisplay(this.currentProgress.points);
        setTimeout(() => pointsDisplay.classList.remove('points-added'), 500);
    }
    
    // Remove notification after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show achievement notification
showAchievementNotification(achievementName, points) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">🏆</div>
            <div class="notification-text">
                <div class="notification-title">Achievement Unlocked!</div>
                <div class="notification-achievement">${achievementName}</div>
                <div class="notification-points">+${points} Bonus Points</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Play sound if available
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT' +
                         'QwTW7Xm67JdGAUvgs/12oo0CBpktfDemU8OE1mz5eqpWRkFNoHS9tiGLgggZrvv45dLEBVYqOnqsV4TBDyY2/XAcSAELHbI8N+NMggaabvt559OEAxPqOPwtmQcBjiP1/HMeS0GI3fH8N+RQAoUXrTp66hVFApGnt/yvmwhBSuAzvLZiTYIG2m98OScTgwOUqnm7blmFgU7k9n1unEiBC13yO/eizEIHWu+8+OWTQwTWrTm67JdGAUvgs/12oo0CC' +
                         'Bktf');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors
    } catch (e) {}
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
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
            if (loginEl) {
                loginEl.style.display = 'none';
            }
            
            // Show user info
            const userEl = document.getElementById('user-info');
            if (userEl) {
                userEl.style.display = 'flex'; // Changed from 'block' to 'flex' to match CSS
                userEl.innerHTML = `
                    <span>Student: ${this.currentStudent.studentId}</span>
                    <span id="points-display" style="
                        background: var(--ocu-green, #10b981);
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