class AchievementChecker {
    constructor(authManager) {
        this.authManager = authManager;
        
        // Complete achievement definitions
        this.ACHIEVEMENTS = [
            // Progress Achievements
            { id: 'first_steps', name: 'First Steps', icon: '🌱', points: 10, type: 'progress', threshold: 1 },
            { id: 'quick_learner', name: 'Quick Learner', icon: '📚', points: 25, type: 'progress', threshold: 5 },
            { id: 'dedicated_student', name: 'Dedicated Student', icon: '🎓', points: 50, type: 'progress', threshold: 10 },
            { id: 'knowledge_seeker', name: 'Knowledge Seeker', icon: '🔍', points: 100, type: 'progress', threshold: 20 },
            { id: 'course_master', name: 'Course Master', icon: '👨‍🎓', points: 500, type: 'progress', threshold: 31 },
            
            // Streak Achievements
            { id: 'consistent', name: 'Consistent', icon: '🔥', points: 30, type: 'streak', threshold: 3 },
            { id: 'week_warrior', name: 'Week Warrior', icon: '💪', points: 75, type: 'streak', threshold: 7 },
            { id: 'unstoppable', name: 'Unstoppable', icon: '⚡', points: 150, type: 'streak', threshold: 14 },
            { id: 'legendary_streak', name: 'Legendary Streak', icon: '🌟', points: 500, type: 'streak', threshold: 30 },
            
            // Special Achievements
            { id: 'early_bird', name: 'Early Bird', icon: '🌅', points: 25, type: 'special' },
            { id: 'night_owl', name: 'Night Owl', icon: '🦉', points: 25, type: 'special' },
            { id: 'weekend_warrior', name: 'Weekend Warrior', icon: '🎯', points: 30, type: 'special' },
            { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', points: 50, type: 'special' }
        ];
    }
    
    async checkAllAchievements() {
        if (!this.authManager.currentProgress) return;
        
        const newAchievements = [];
        const existingIds = new Set((this.authManager.currentProgress.achievements || []).map(a => a.id));
        
        // Check progress achievements
        const lectureCount = (this.authManager.currentProgress.lecturesViewed || []).length;
        for (const achievement of this.ACHIEVEMENTS.filter(a => a.type === 'progress')) {
            if (!existingIds.has(achievement.id) && lectureCount >= achievement.threshold) {
                newAchievements.push(achievement);
            }
        }
        
        // Check streak achievements
        const streak = this.authManager.currentProgress.streak || 0;
        for (const achievement of this.ACHIEVEMENTS.filter(a => a.type === 'streak')) {
            if (!existingIds.has(achievement.id) && streak >= achievement.threshold) {
                newAchievements.push(achievement);
            }
        }
        
        // Check time-based achievements
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 8 && !existingIds.has('early_bird')) {
            const earlyBird = this.ACHIEVEMENTS.find(a => a.id === 'early_bird');
            if (earlyBird) newAchievements.push(earlyBird);
        }
        if ((hour >= 0 && hour < 5 || hour >= 22) && !existingIds.has('night_owl')) {
            const nightOwl = this.ACHIEVEMENTS.find(a => a.id === 'night_owl');
            if (nightOwl) newAchievements.push(nightOwl);
        }
        
        // Award new achievements
        for (const achievement of newAchievements) {
            await this.awardAchievement(achievement);
        }
        
        return newAchievements;
    }
    
    async awardAchievement(achievement) {
        console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
        
        // Add to achievements array
        if (!this.authManager.currentProgress.achievements) {
            this.authManager.currentProgress.achievements = [];
        }
        
        this.authManager.currentProgress.achievements.push({
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon,
            unlockedAt: new Date().toISOString(),
            points: achievement.points
        });
        
        // Add points
        this.authManager.currentProgress.totalPoints = 
            (this.authManager.currentProgress.totalPoints || 0) + achievement.points;
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Save progress
        await this.authManager.saveProgress();
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2.5em;">${achievement.icon}</div>
                <div>
                    <div style="font-size: 0.9em; opacity: 0.9;">Achievement Unlocked!</div>
                    <div style="font-size: 1.2em; margin-bottom: 3px;">${achievement.name}</div>
                    ${achievement.points > 0 ? `<div style="opacity: 0.9;">+${achievement.points} Points</div>` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
}

// Main Authentication Class - UPDATED TO USE NETLIFY FUNCTIONS
class SimpleGistAuth {
    constructor() {
        // Netlify function endpoints (NO DIRECT GITHUB API CALLS)
        this.AUTH_URL = '/.netlify/functions/authenticate';
        this.UPDATE_URL = '/.netlify/functions/update-points';
        
        // Data storage
        this.currentStudent = null;
        this.currentProgress = null;
        this.studentGistId = null;
        
        // Initialize achievement checker
        this.achievementChecker = new AchievementChecker(this);
        
        // Check if already authenticated
        this.checkAuthStatus();
    }
    
    async authenticate(studentId, pin) {
        console.log('🔵 Starting authentication for:', studentId);
        
        try {
            // Use the authenticated Netlify function
            const response = await fetch(this.AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: studentId,
                    pin: pin
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Authentication failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Authentication failed');
            }
            
            console.log('✅ Authentication successful!');
            
            // Store authentication
            const authData = {
                studentId: studentId,
                authenticated: true,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('csci3403_auth', JSON.stringify(authData));
            this.currentStudent = authData;
            
            // Store student data
            this.studentGistId = result.gistId;
            this.currentProgress = result.studentData;
            localStorage.setItem(`student_${studentId}`, JSON.stringify(result.studentData));
            
            // Update UI
            this.updateUIForAuthenticated();
            this.updatePointsDisplay(result.studentData.totalPoints || 0);
            
            // Show appropriate message
            if (result.isNewStudent) {
                this.showPointsNotification(10, 'Welcome to CSCI 3403!');
                console.log('🎉 New student registered successfully!');
            } else {
                console.log('👋 Welcome back!');
                const streak = result.studentData.streak || 0;
                if (streak > 1) {
                    this.showPointsNotification(0, `${streak} day streak! 🔥`);
                }
            }
            
            // Check for achievements
            await this.achievementChecker.checkAllAchievements();
            
            // Log rate limit status if available
            if (result.rateLimit) {
                console.log(`API Rate Limit: ${result.rateLimit.remaining}/${result.rateLimit.limit} remaining`);
            }
            
            return true;
            
        } catch (error) {
            console.error('Authentication failed:', error);
            
            if (error.message.includes('Invalid PIN')) {
                alert('Invalid PIN. Please try again.');
            } else if (error.message.includes('required')) {
                alert('Please enter both your name and PIN.');
            } else {
                alert('Authentication error: ' + error.message);
            }
            
            return false;
        }
    }
    
    async saveProgress() {
        if (!this.currentStudent || !this.studentGistId || !this.currentProgress) {
            console.error('Cannot save: missing data');
            return false;
        }
        
        try {
            // Update through authenticated Netlify function
            const response = await fetch(this.UPDATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateStudent',
                    studentId: this.currentStudent.studentId,
                    gistId: this.studentGistId,
                    updateData: this.currentProgress
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save progress');
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Save failed');
            }
            
            // Update local storage
            localStorage.setItem(`student_${this.currentStudent.studentId}`, 
                JSON.stringify(this.currentProgress));
            
            console.log('✅ Progress saved successfully');
            return true;
            
        } catch (error) {
            console.error('Error saving progress:', error);
            // Still save locally even if server save fails
            localStorage.setItem(`student_${this.currentStudent.studentId}`, 
                JSON.stringify(this.currentProgress));
            return false;
        }
    }
    
    async trackLectureView(lectureNumber, lectureTitle) {
        if (!this.currentProgress) return;
        
        // Initialize arrays if needed
        if (!this.currentProgress.lecturesViewed) {
            this.currentProgress.lecturesViewed = [];
        }
        
        // Check if already viewed
        if (this.currentProgress.lecturesViewed.includes(lectureNumber)) {
            console.log('Lecture already viewed');
            return;
        }
        
        // Add to viewed lectures
        this.currentProgress.lecturesViewed.push(lectureNumber);
        
        // Award points
        const points = 10;
        this.currentProgress.totalPoints = (this.currentProgress.totalPoints || 0) + points;
        
        // Add activity
        if (!this.currentProgress.activities) {
            this.currentProgress.activities = [];
        }
        
        this.currentProgress.activities.push({
            type: 'lecture_viewed',
            lectureNumber: lectureNumber,
            lectureTitle: lectureTitle,
            points: points,
            timestamp: new Date().toISOString()
        });
        
        // Update UI
        this.updatePointsDisplay(this.currentProgress.totalPoints);
        this.showPointsNotification(points, `Viewed: ${lectureTitle}`);
        
        // Check achievements
        await this.achievementChecker.checkAllAchievements();
        
        // Save progress
        await this.saveProgress();
    }
    
    async trackLectureViewEnhanced(lectureNumber, lectureTitle) {
        // Enhanced tracking with 30-second requirement
        if (!this.currentProgress) return;
        
        const viewKey = `lecture_${lectureNumber}_viewing`;
        const startTime = Date.now();
        
        // Store start time
        sessionStorage.setItem(viewKey, startTime);
        
        // After 30 seconds, award points
        setTimeout(async () => {
            const storedTime = sessionStorage.getItem(viewKey);
            if (storedTime && (Date.now() - parseInt(storedTime)) >= 29000) {
                await this.trackLectureView(lectureNumber, lectureTitle);
                sessionStorage.removeItem(viewKey);
            }
        }, 30000);
    }
    
    updateUIForAuthenticated() {
        // Hide login forms
        const authSections = document.querySelectorAll('.auth-section, #auth-section');
        authSections.forEach(section => {
            if (section) section.style.display = 'none';
        });
        
        // Show authenticated UI elements
        const welcomeMessages = document.querySelectorAll('.welcome-message');
        welcomeMessages.forEach(msg => {
            if (msg && this.currentStudent) {
                msg.textContent = `Welcome, ${this.currentStudent.studentId}!`;
                msg.style.display = 'block';
            }
        });
    }
    
    updatePointsDisplay(points) {
        const pointsDisplays = document.querySelectorAll('.points-display, #points-display');
        pointsDisplays.forEach(display => {
            if (display) {
                display.textContent = `${points} Points`;
                display.style.display = 'block';
            }
        });
    }
    
    showPointsNotification(points, message) {
        const notification = document.createElement('div');
        notification.className = 'points-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00d25b, #00a847);
            color: white;
            padding: 15px 25px;
            border-radius: 50px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: bold;
        `;
        
        notification.textContent = points > 0 ? `+${points} Points: ${message}` : message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    checkAuthStatus() {
        const authData = localStorage.getItem('csci3403_auth');
        
        // Auto-track lecture views if on a lecture page
        const checkLecturePage = setInterval(() => {
            const path = window.location.pathname;
            const lectureMatch = path.match(/\/(\d+)[A-Z]/);
            
            if (lectureMatch && authData) {
                clearInterval(checkLecturePage);
                const lectureNumber = parseInt(lectureMatch[1]);
                const pageTitle = document.title;
                const lectureTitle = pageTitle.includes('CSCI') ? 
                    pageTitle.split('-')[1]?.trim() || `Lecture ${lectureNumber}` : 
                    `Lecture ${lectureNumber}`;
                
                // Start tracking with 30 second delay
                setTimeout(() => {
                    this.trackLectureViewEnhanced(lectureNumber, lectureTitle);
                }, 30000);
            }
        }, 1000);
        
        if (authData) {
            try {
                this.currentStudent = JSON.parse(authData);
                this.updateUIForAuthenticated();
                
                // Load student progress from local storage
                const studentData = localStorage.getItem(`student_${this.currentStudent.studentId}`);
                if (studentData) {
                    this.currentProgress = JSON.parse(studentData);
                    this.updatePointsDisplay(this.currentProgress.totalPoints || 0);
                }
                
                return true;
            } catch (e) {
                console.error('Invalid auth data');
                localStorage.removeItem('csci3403_auth');
            }
        }
        return false;
    }
    
    logout() {
        if (this.currentStudent) {
            localStorage.removeItem('csci3403_auth');
            localStorage.removeItem(`student_${this.currentStudent.studentId}`);
        }
        location.reload();
    }
}

// Initialize on page load
let auth;
document.addEventListener('DOMContentLoaded', () => {
    auth = new SimpleGistAuth();
    window.authManager = auth;
});

console.log('Auth.js loaded successfully - Using authenticated Netlify functions');