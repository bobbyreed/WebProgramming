exports.handler = async (event, context) => {
    // 1. Never log sensitive data
    console.log('Function called:', event.httpMethod);
    // NOT: console.log('Full event:', event);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    try {
        const data = JSON.parse(event.body);
        const { action, studentId, updateData } = data;
        
        // 2. Validate input
        if (!action || !studentId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }
        
        // 3. Perform GitHub operations
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        // Use token for API calls...
        
        // 4. CRITICAL: Return minimal data
        switch(action) {
            case 'updateStudent':
                // Do the GitHub update...
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        action: 'update',
                        message: 'Student data updated'
                        // That's it! No GitHub response data
                    })
                };
                
            case 'createGist':
                // Create the gist...
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        action: 'create',
                        message: 'Student profile created'
                        // No gist ID, no URLs, nothing else
                    })
                };
        }
        
    } catch (error) {
        // 5. Never expose real errors
        console.error('Server error:', error); // Log server-side only
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Operation failed'
                // Generic error, no details
            })
        };
    }
};

exports.handler = async (event, context) => {
    // CORS headers for local development
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    
    // Get the GitHub token from environment variable (set in Netlify dashboard)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    
    if (!GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN not configured in Netlify environment variables');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }
    
    const API_BASE = 'https://api.github.com/gists';
    
    try {
        // Parse the request
        const data = JSON.parse(event.body);
        const { action, studentId, gistId, updateData, masterGistId } = data;
        
        let response;
        let result;
        
        switch(action) {
            case 'updateStudent':
                // Update existing student gist
                console.log(`Updating student ${studentId} gist ${gistId}`);
                
                response = await fetch(`${API_BASE}/${gistId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            'student-data.json': {
                                content: JSON.stringify(updateData, null, 2)
                            }
                        }
                    })
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`GitHub API error: ${response.status} - ${error}`);
                }
                
                result = await response.json();
                break;
                
            case 'createGist':
                // Create new student gist
                console.log(`Creating new gist for student ${studentId}`);
                
                response = await fetch(API_BASE, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        description: `CSCI 3403 - Student Data - ${studentId}`,
                        public: false,
                        files: {
                            'student-data.json': {
                                content: JSON.stringify(updateData, null, 2)
                            }
                        }
                    })
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`GitHub API error: ${response.status} - ${error}`);
                }
                
                result = await response.json();
                break;
                
            case 'updateMaster':
                // First, fetch current master config
                console.log(`Updating master config with student ${studentId}`);
                
                const masterResponse = await fetch(`${API_BASE}/${masterGistId}`, {
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
                
                // Add new student
                if (!config.students) {
                    config.students = {};
                }
                config.students[studentId] = gistId;
                config.lastUpdated = new Date().toISOString();
                
                // Update master gist
                response = await fetch(`${API_BASE}/${masterGistId}`, {
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
                
                if (!response.ok) {
                    throw new Error(`Failed to update master config: ${response.status}`);
                }
                
                result = await response.json();
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                studentId: studentId,
                message: 'Update successful'
            })
        };
        
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                action: data?.action,
                studentId: data?.studentId 
            })
        };
    }
};