// netlify/functions/authenticate.js
// Authenticated function for student login and registration

exports.handler = async (event, context) => {
    console.log('Authentication function invoked');
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method not allowed' 
            })
        };
    }
    
    // Get GitHub token from environment
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    
    if (!GITHUB_TOKEN) {
        console.error('GitHub token not configured');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Server configuration error' 
            })
        };
    }
    
    // Parse request body
    let data;
    try {
        data = JSON.parse(event.body || '{}');
        console.log('Auth request for student:', data.studentId);
    } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Invalid request format' 
            })
        };
    }
    
    const { studentId, pin } = data;
    
    if (!studentId || !pin) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Student ID and PIN are required' 
            })
        };
    }
    
    const API_BASE = 'https://api.github.com/gists';
    const MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
    
    try {
        // Step 1: Fetch and verify master config with authentication
        console.log('Fetching master config...');
        const masterResponse = await fetch(`${API_BASE}/${MASTER_GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!masterResponse.ok) {
            console.error('Failed to fetch master config:', masterResponse.status);
            throw new Error(`Failed to fetch config: ${masterResponse.status}`);
        }
        
        const masterGist = await masterResponse.json();
        const config = JSON.parse(masterGist.files['csci3403-config.json'].content);
        
        // Step 2: Verify PIN
        if (config.classPin !== pin) {
            console.log('PIN verification failed');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Invalid PIN' 
                })
            };
        }
        
        console.log('PIN verified successfully');
        
        // Step 3: Check if student exists
        const studentExists = config.students && config.students[studentId];
        let studentData = null;
        let gistId = null;
        
        if (studentExists) {
            // Step 4a: Load existing student data with authentication
            gistId = config.students[studentId];
            console.log(`Loading existing student ${studentId} from gist ${gistId}`);
            
            const studentResponse = await fetch(`${API_BASE}/${gistId}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (studentResponse.ok) {
                const studentGist = await studentResponse.json();
                studentData = JSON.parse(studentGist.files['student-data.json'].content);
                
                // Update last login
                const now = new Date();
                const lastActive = new Date(studentData.lastActive || now);
                const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
                
                // Update streak
                if (lastActive.toDateString() !== now.toDateString() && hoursSinceActive < 48) {
                    studentData.streak = (studentData.streak || 0) + 1;
                } else if (hoursSinceActive > 48) {
                    studentData.streak = 1;
                }
                
                studentData.lastActive = now.toISOString();
                studentData.lastLogin = now.toISOString();
            } else {
                console.error('Failed to load student data:', studentResponse.status);
                // Continue with registration as new student
                studentExists = false;
            }
        }
        
        if (!studentExists) {
            // Step 4b: Create new student
            console.log(`Creating new student profile for ${studentId}`);
            
            studentData = {
                studentId: studentId,
                name: studentId,
                joinedDate: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                totalPoints: 10, // Welcome bonus
                lecturesViewed: [],
                achievements: [
                    {
                        id: 'welcome',
                        name: 'Welcome!',
                        icon: '🎉',
                        unlockedAt: new Date().toISOString(),
                        points: 10
                    }
                ],
                streak: 1,
                activities: [
                    {
                        type: 'joined_class',
                        points: 10,
                        timestamp: new Date().toISOString(),
                        description: 'Welcome to CSCI 3403!'
                    }
                ],
                showcase: []
            };
            
            // Create the gist
            const createResponse = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: `CSCI 3403 - Student Data: ${studentId}`,
                    public: true,
                    files: {
                        'student-data.json': {
                            content: JSON.stringify(studentData, null, 2)
                        }
                    }
                })
            });
            
            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('Failed to create student gist:', errorText);
                throw new Error('Failed to create student profile');
            }
            
            const newGist = await createResponse.json();
            gistId = newGist.id;
            console.log(`Created new gist ${gistId} for student ${studentId}`);
            
            // Update master config with new student
            if (!config.students) {
                config.students = {};
            }
            config.students[studentId] = gistId;
            config.lastUpdated = new Date().toISOString();
            
            const updateMasterResponse = await fetch(`${API_BASE}/${MASTER_GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'csci3403-config.json': {
                            content: JSON.stringify(config, null, 2)
                        }
                    }
                })
            });
            
            if (!updateMasterResponse.ok) {
                console.error('Failed to update master config with new student');
                // Not critical - student was created successfully
            }
        }
        
        // Step 5: Check rate limit
        const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let rateLimit = null;
        if (rateLimitResponse.ok) {
            const rateLimitData = await rateLimitResponse.json();
            rateLimit = {
                limit: rateLimitData.rate.limit,
                remaining: rateLimitData.rate.remaining,
                reset: new Date(rateLimitData.rate.reset * 1000).toISOString()
            };
        }
        
        // Return success with student data
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                isNewStudent: !studentExists,
                studentId: studentId,
                gistId: gistId,
                studentData: studentData,
                rateLimit: rateLimit
            })
        };
        
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Authentication failed'
            })
        };
    }
};