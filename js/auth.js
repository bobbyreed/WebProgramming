// Achievement Checker Class - Separate from SimpleGistAuth
class AchievementChecker {
    constructor(authManager) {
        this.authManager = authManager;
        
        // Complete achievement definitions matching userAchievements.html
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
            
            // Skill Achievements
            { id: 'html_hero', name: 'HTML Hero', icon: '📝', points: 50, type: 'skill', lectures: [3,4,5,6] },
            { id: 'css_wizard', name: 'CSS Wizard', icon: '🎨', points: 50, type: 'skill', lectures: [7,8,11,12,13,14] },
            { id: 'js_ninja', name: 'JavaScript Ninja', icon: '⚔️', points: 100, type: 'skill', lectures: [17,18,19,20,21,22,23,24] },
            { id: 'git_guru', name: 'Git Guru', icon: '🔧', points: 75, type: 'skill', lectures: [6,9] },
            
            // Special Achievements
            { id: 'early_bird', name: 'Early Bird', icon: '🌅', points: 25, type: 'special' },
            { id: 'night_owl', name: 'Night Owl', icon: '🦉', points: 25, type: 'special' },
            { id: 'weekend_warrior', name: 'Weekend Warrior', icon: '🏖️', points: 30, type: 'special' },
            { id: 'perfectionist', name: 'Perfectionist', icon: '💯', points: 50, type: 'special' },
            
            // Milestone Achievements
            { id: 'rising_star', name: 'Rising Star', icon: '⭐', points: 0, type: 'milestone', threshold: 100 },
            { id: 'achiever', name: 'Achiever', icon: '🎯', points: 0, type: 'milestone', threshold: 500 },
            { id: 'champion', name: 'Champion', icon: '🏆', points: 0, type: 'milestone', threshold: 1000 },
            { id: 'legend', name: 'Legend', icon: '👑', points: 0, type: 'milestone', threshold: 2000 },
            
            // Social Achievements
            { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', points: 20, type: 'social' },
            { id: 'showcase_star', name: 'Showcase Star', icon: '✨', points: 30, type: 'social' },
            { id: 'team_player', name: 'Team Player', icon: '🤝', points: 50, type: 'social' },
            { id: 'ocu_hero', name: 'OCU Hero', icon: '🦅', points: 200, type: 'social' }
        ];
    }

    // Check all achievements after any action
    async checkAllAchievements() {
        if (!this.authManager.currentProgress) return;
        
        const progress = this.authManager.currentProgress;
        const currentAchievements = progress.achievements || [];
        const newAchievements = [];
        
        // Check each achievement type
        this.checkProgressAchievements(progress, currentAchievements, newAchievements);
        this.checkStreakAchievements(progress, currentAchievements, newAchievements);
        this.checkSkillAchievements(progress, currentAchievements, newAchievements);
        this.checkSpecialAchievements(progress, currentAchievements, newAchievements);
        this.checkMilestoneAchievements(progress, currentAchievements, newAchievements);
        
        // Award new achievements
        if (newAchievements.length > 0) {
            await this.awardAchievements(newAchievements);
        }
    }

    // Check progress-based achievements
    checkProgressAchievements(progress, currentAchievements, newAchievements) {
        const lectureCount = Object.keys(progress.viewedLectures || {}).length;
        
        this.ACHIEVEMENTS
            .filter(a => a.type === 'progress')
            .forEach(achievement => {
                if (lectureCount >= achievement.threshold && 
                    !currentAchievements.includes(achievement.id)) {
                    newAchievements.push(achievement);
                }
            });
    }

    // Check streak achievements
    checkStreakAchievements(progress, currentAchievements, newAchievements) {
        const streak = progress.streak || 0;
        
        this.ACHIEVEMENTS
            .filter(a => a.type === 'streak')
            .forEach(achievement => {
                if (streak >= achievement.threshold && 
                    !currentAchievements.includes(achievement.id)) {
                    newAchievements.push(achievement);
                }
            });
    }

    // Check skill-based achievements (specific lecture sets)
    checkSkillAchievements(progress, currentAchievements, newAchievements) {
        const viewedLectures = progress.viewedLectures || {};
        
        this.ACHIEVEMENTS
            .filter(a => a.type === 'skill' && a.lectures)
            .forEach(achievement => {
                // Check if all required lectures are viewed
                const allViewed = achievement.lectures.every(num => 
                    viewedLectures[num] || viewedLectures[`lecture${num}`]
                );
                
                if (allViewed && !currentAchievements.includes(achievement.id)) {
                    newAchievements.push(achievement);
                }
            });
    }

    // Check special time-based achievements
    checkSpecialAchievements(progress, currentAchievements, newAchievements) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        // Early Bird - active before 7 AM
        if (hour < 7 && !currentAchievements.includes('early_bird')) {
            const earlyBird = this.ACHIEVEMENTS.find(a => a.id === 'early_bird');
            if (earlyBird) newAchievements.push(earlyBird);
        }
        
        // Night Owl - active after midnight
        if ((hour >= 0 && hour < 4) && !currentAchievements.includes('night_owl')) {
            const nightOwl = this.ACHIEVEMENTS.find(a => a.id === 'night_owl');
            if (nightOwl) newAchievements.push(nightOwl);
        }
        
        // Weekend Warrior - active on weekends
        if ((day === 0 || day === 6) && !currentAchievements.includes('weekend_warrior')) {
            const weekendWarrior = this.ACHIEVEMENTS.find(a => a.id === 'weekend_warrior');
            if (weekendWarrior) newAchievements.push(weekendWarrior);
        }
        
        // Perfectionist - reviewed 5+ lectures
        const reviewedCount = Object.values(progress.viewedLectures || {})
            .filter(lecture => lecture.views && lecture.views > 1).length;
        
        if (reviewedCount >= 5 && !currentAchievements.includes('perfectionist')) {
            const perfectionist = this.ACHIEVEMENTS.find(a => a.id === 'perfectionist');
            if (perfectionist) newAchievements.push(perfectionist);
        }
    }

    // Check milestone achievements (points-based)
    checkMilestoneAchievements(progress, currentAchievements, newAchievements) {
        const points = progress.points || 0;
        
        this.ACHIEVEMENTS
            .filter(a => a.type === 'milestone')
            .forEach(achievement => {
                if (points >= achievement.threshold && 
                    !currentAchievements.includes(achievement.id)) {
                    newAchievements.push(achievement);
                }
            });
    }

    // Award achievements and update student data
    async awardAchievements(newAchievements) {
        const progress = this.authManager.currentProgress;
        
        for (const achievement of newAchievements) {
            // Add to achievements array
            if (!progress.achievements) {
                progress.achievements = [];
            }
            progress.achievements.push(achievement.id);
            
            // Award points if applicable
            if (achievement.points > 0) {
                progress.points = (progress.points || 0) + achievement.points;
            }
            
            // Log activity
            if (!progress.activities) {
                progress.activities = [];
            }
            progress.activities.unshift({
                type: 'achievement_earned',
                achievementId: achievement.id,
                achievementName: achievement.name,
                achievementIcon: achievement.icon,
                points: achievement.points,
                timestamp: new Date().toISOString(),
                description: `Earned achievement: ${achievement.name}`
            });
            
            // Show notification
            this.showAchievementNotification(achievement);
        }
        
        // Keep only last 100 activities
        if (progress.activities.length > 100) {
            progress.activities = progress.activities.slice(0, 100);
        }
        
        // Update the student's gist
        await this.authManager.updateStudentData(progress);
    }

    // Show achievement notification
    showAchievementNotification(achievement) {
        // Remove any existing achievement notifications
        document.querySelectorAll('.achievement-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #70bf54, #9ed774);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            max-width: 350px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 3em;">${achievement.icon}</div>
                <div>
                    <div style="font-weight: bold; font-size: 1.1em; margin-bottom: 5px;">
                        Achievement Unlocked!
                    </div>
                    <div style="font-size: 1.2em; margin-bottom: 3px;">
                        ${achievement.name}
                    </div>
                    ${achievement.points > 0 ? 
                        `<div style="opacity: 0.9;">+${achievement.points} Points</div>` : 
                        ''
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
}

// Main Authentication Class
class SimpleGistAuth {
    constructor() {
        // Master gist ID - this is PUBLIC so it's safe to have here
        this.MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
        
        // GitHub API base (for PUBLIC reads only)
        this.API_BASE = 'https://api.github.com/gists';
        
        // Netlify function endpoint (for PRIVATE writes)
        this.FUNCTION_URL = '/.netlify/functions/update-points';
        
        // Initialize achievement checker
        this.achievementChecker = new AchievementChecker(this);
        
        // Check if already authenticated
        this.checkAuthStatus();
        // queue for pending updates
        this.updateQueue = [];
        this.isProcessingQueue = false;
        this.lastSyncTime = 0;
        this.SYNC_DEBOUNCE_MS = 1000; // Debounce saves to prevent race conditions
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
            
            // Verify PIN
            if (config.classPin !== pin) {
                console.error('❌ PIN mismatch');
                throw new Error('Invalid PIN');
            }
            
            console.log('✅ PIN verified!');
            
            // Store authentication
            const authData = {
                studentId: studentId,
                authenticated: true,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('csci3403_auth', JSON.stringify(authData));
            this.currentStudent = authData;
            
            // Update UI immediately after storing auth
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
                    updateData: studentData,
                    masterGistId: this.MASTER_GIST_ID  
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create gist');
            }
            
            const result = await response.json();
            
            if (result.success && result.gistId) {
                this.studentGistId = result.gistId;
                
                // Store locally
                localStorage.setItem(`student_${studentId}`, JSON.stringify(studentData));
                this.currentProgress = studentData;
                
                // Update UI
                this.updatePointsDisplay(studentData.points);
                
                // Show welcome message
                this.showPointsNotification(10, 'Welcome to CSCI 3403!');
                
                // Check for initial achievements
                await this.achievementChecker.checkAllAchievements();
            } else {
                throw new Error('Failed to get gist ID from server');
            }
            
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

    async updateStudentData(studentData) {
        try {
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
            
            const result = await response.json();
            
            if (result.success) {
                // Update local storage
                localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(studentData));
                this.currentProgress = studentData;
                
                // Update UI
                this.updatePointsDisplay(studentData.points);
                
                console.log('Student data updated successfully');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error updating gist:', error);
            
            // Still update locally even if server fails
            localStorage.setItem(`student_${this.currentStudent.studentId}`, JSON.stringify(studentData));
            this.currentProgress = studentData;
            this.updatePointsDisplay(studentData.points);
            
            return false;
        }
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
        }
        
        // Update the student's gist
        const success = await this.updateStudentData(this.currentProgress);
        
        if (success) {
            // Check for achievements AFTER updating data
            await this.achievementChecker.checkAllAchievements();
            
            if (pointsAwarded > 0) {
                // Show enhanced notification
                this.showEnhancedPointsNotification(pointsAwarded, lectureTitle, !lectureData);
            }
        }
        
        return success;
    }

    // Track social activities for social achievements
    async trackSocialActivity(activityType) {
        if (!this.currentProgress) return;
        
        const socialActivities = this.currentProgress.socialActivities || {};
        const achievements = this.currentProgress.achievements || [];
        
        switch(activityType) {
            case 'view_leaderboard':
                socialActivities.leaderboardViews = (socialActivities.leaderboardViews || 0) + 1;
                
                // Check for Social Butterfly achievement (10 leaderboard views)
                if (socialActivities.leaderboardViews >= 10 && 
                    !achievements.includes('social_butterfly')) {
                    const achievement = this.achievementChecker.ACHIEVEMENTS.find(a => a.id === 'social_butterfly');
                    if (achievement) {
                        await this.achievementChecker.awardAchievements([achievement]);
                    }
                }
                break;
                
            case 'update_showcase':
                socialActivities.showcaseUpdates = (socialActivities.showcaseUpdates || 0) + 1;
                
                // Check for Showcase Star achievement (3 showcase updates)
                if (socialActivities.showcaseUpdates >= 3 && 
                    !achievements.includes('showcase_star')) {
                    const achievement = this.achievementChecker.ACHIEVEMENTS.find(a => a.id === 'showcase_star');
                    if (achievement) {
                        await this.achievementChecker.awardAchievements([achievement]);
                    }
                }
                break;
        }
        
        this.currentProgress.socialActivities = socialActivities;
        await this.updateStudentData(this.currentProgress);
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

    // UI Methods
    updateUIForAuthenticated() {
        // Hide login form
        const loginEl = document.getElementById('auth-section');
        if (loginEl) {
            loginEl.style.display = 'none';
        }
        
        // Show user info
        const userEl = document.getElementById('user-info');
        if (userEl) {
            userEl.style.display = 'flex';
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

    showPointsNotification(points, message) {
        // Simple notification - can be enhanced
        console.log(`+${points} points: ${message}`);
    }

    showEnhancedPointsNotification(points, lectureTitle, isFirstView) {
        // Remove any existing notifications
        document.querySelectorAll('.lecture-completion-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'lecture-completion-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: linear-gradient(135deg, #1e4290, #0d2b50);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2em;">${isFirstView ? '🎉' : '✅'}</div>
                <div>
                    <div style="font-weight: bold; font-size: 1.1em;">
                        ${isFirstView ? 'Lecture Completed!' : 'Lecture Reviewed!'}
                    </div>
                    <div style="font-size: 1.5em; margin: 5px 0;">+${points} Points</div>
                    <div style="opacity: 0.9; font-size: 0.9em;">${lectureTitle}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        // Update points display with animation
        const pointsDisplay = document.getElementById('points-display');
        if (pointsDisplay) {
            pointsDisplay.style.transition = 'transform 0.3s ease';
            pointsDisplay.style.transform = 'scale(1.2)';
            this.updatePointsDisplay(this.currentProgress.points);
            setTimeout(() => {
                pointsDisplay.style.transform = 'scale(1)';
            }, 300);
        }
        
        // Remove notification after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
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

    logout() {
        localStorage.removeItem('csci3403_auth');
        localStorage.removeItem(`student_${this.currentStudent.studentId}`);
        location.reload();
    }

    // Test methods for debugging
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
}

// Initialize on page load
let auth;
document.addEventListener('DOMContentLoaded', () => {
    auth = new SimpleGistAuth();
    window.authManager = auth;
});

console.log('Auth.js loaded successfully - Achievement System Integrated');