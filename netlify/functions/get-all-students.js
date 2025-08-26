exports.handler = async (event, context) => {
    console.log('Get all students function invoked');
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    
    // Only accept GET requests
    if (event.httpMethod !== 'GET') {
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
    
    const API_BASE = 'https://api.github.com/gists';
    const MASTER_GIST_ID = '0d1ed1373d1b88183b2e94542bbbad1f';
    
    try {
        // Step 1: Fetch master config with authentication
        console.log('Fetching master config...');
        const masterResponse = await fetch(`${API_BASE}/${MASTER_GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!masterResponse.ok) {
            throw new Error(`Failed to fetch master config: ${masterResponse.status}`);
        }
        
        const masterGist = await masterResponse.json();
        const config = JSON.parse(masterGist.files['csci3403-config.json'].content);
        
        // Step 2: Check rate limit status
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
        
        // Step 3: Fetch all student data in parallel with authentication
        const students = {};
        const errors = [];
        
        if (config.students && Object.keys(config.students).length > 0) {
            console.log(`Fetching data for ${Object.keys(config.students).length} students...`);
            
            // Create promises for all student fetches
            const promises = Object.entries(config.students).map(async ([studentId, gistId]) => {
                try {
                    const response = await fetch(`${API_BASE}/${gistId}`, {
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    
                    if (!response.ok) {
                        console.error(`Failed to fetch ${studentId}: ${response.status}`);
                        errors.push({ studentId, error: `HTTP ${response.status}` });
                        return null;
                    }
                    
                    const gist = await response.json();
                    
                    if (gist.files && gist.files['student-data.json']) {
                        const studentData = JSON.parse(gist.files['student-data.json'].content);
                        students[studentId] = {
                            ...studentData,
                            gistId: gistId,
                            lastUpdated: gist.updated_at
                        };
                    } else {
                        errors.push({ studentId, error: 'No data file found' });
                    }
                } catch (error) {
                    console.error(`Error fetching ${studentId}:`, error);
                    errors.push({ studentId, error: error.message });
                }

                if (studentData.points !== undefined && studentData.totalPoints === undefined) {
        studentData.totalPoints = studentData.points;
    }
            // Also ensure viewedLectures exists for backward compatibility
            if (!studentData.viewedLectures && studentData.lecturesViewed) {
                studentData.viewedLectures = {};
                // Convert array to object if needed
                studentData.lecturesViewed.forEach(lectureNum => {
                    studentData.viewedLectures[lectureNum] = { views: 1 };
                });
            }
            
            students[studentId] = {
                ...studentData,
                totalPoints: studentData.totalPoints || studentData.points || 0, // Ensure totalPoints exists
                gistId: gistId,
                lastUpdated: gist.updated_at
            };
            });
            
            // Wait for all fetches to complete
            await Promise.all(promises);
        }
        
        console.log(`Successfully fetched ${Object.keys(students).length} students`);
        if (errors.length > 0) {
            console.log(`Errors occurred for ${errors.length} students`);
        }
        
        // Return aggregated data
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                config: {
                    classPin: config.classPin,
                    adminPin: config.adminPin,
                    lastUpdated: config.lastUpdated,
                    totalStudents: Object.keys(config.students || {}).length
                },
                students: students,
                errors: errors.length > 0 ? errors : undefined,
                rateLimit: rateLimit,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error in get-all-students:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};