exports.handler = async (event, context) => {
    console.log('=== Function Start ===');
    console.log('Method:', event.httpMethod);
    console.log('Has token?:', !!process.env.GITHUB_TOKEN);
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { 
            statusCode: 200, 
            headers, 
            body: '' 
        };
    }
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method Not Allowed' 
            })
        };
    }
    
    // Get the GitHub token from environment variable
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    
    if (!GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN not configured in Netlify environment variables');
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
        data = JSON.parse(event.body);
        console.log('Action requested:', data.action);
        console.log('Student ID:', data.studentId);
        console.log('Has gistId?:', !!data.gistId);
        console.log('Has updateData?:', !!data.updateData);
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
    
    // Validate required fields
    const { action, studentId, gistId, updateData, masterGistId } = data;
    
    if (!action || !studentId) {
        console.error('Missing required fields - action:', action, 'studentId:', studentId);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Missing required fields' 
            })
        };
    }
    
    const API_BASE = 'https://api.github.com/gists';
    
    try {
        let response;
        
        switch(action) {
            case 'updateStudent':
                // Validate gistId for update
                if (!gistId || gistId === 'undefined') {
                    console.error('Invalid gistId for update:', gistId);
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Invalid student data' 
                        })
                    };
                }
                
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
                    const errorText = await response.text();
                    console.error('GitHub API error for update:', response.status, errorText);
                    
                    // Don't expose GitHub error details
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Failed to update student data' 
                        })
                    };
                }
                
                console.log('Update successful');
                
                // CRITICAL: Don't return GitHub response
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        action: 'update',
                        message: 'Student data updated successfully'
                    })
                };
                
            case 'createGist':
                console.log(`Creating new gist for student ${studentId}`);
                
                if (!updateData) {
                    console.error('No data provided for new gist');
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'No data provided' 
                        })
                    };
                }
                
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
                    const errorText = await response.text();
                    console.error('GitHub API error for create:', response.status, errorText);
                    
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Failed to create student profile' 
                        })
                    };
                }
                
                const newGist = await response.json();
                const newGistId = newGist.id;
                console.log('Gist created successfully:', newGistId);
                
                // Update master config if masterGistId provided
                if (masterGistId) {
                    try {
                        console.log('Updating master config...');
                        
                        // Fetch current master config
                        const masterResponse = await fetch(`${API_BASE}/${masterGistId}`, {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (!masterResponse.ok) {
                            console.error('Failed to fetch master config:', masterResponse.status);
                            // Don't fail the whole operation
                        } else {
                            const masterGist = await masterResponse.json();
                            const config = JSON.parse(masterGist.files['csci3403-config.json'].content);
                            
                            // Add new student
                            if (!config.students) {
                                config.students = {};
                            }
                            config.students[studentId] = newGistId;
                            config.lastUpdated = new Date().toISOString();
                            
                            // Update master gist
                            const updateResponse = await fetch(`${API_BASE}/${masterGistId}`, {
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
                            
                            if (!updateResponse.ok) {
                                console.error('Failed to update master config:', updateResponse.status);
                                // Don't fail the whole operation
                            } else {
                                console.log('Master config updated');
                            }
                        }
                    } catch (masterError) {
                        console.error('Error updating master:', masterError);
                        // Continue anyway - gist was created
                    }
                }
                
                // Return minimal data with gistId for client storage
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        action: 'create',
                        message: 'Student profile created successfully',
                        gistId: newGistId  // Client needs this for future updates
                    })
                };
                
            case 'updateMaster':
                // This is a standalone master update
                if (!masterGistId || !gistId) {
                    console.error('Missing data for master update');
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Missing required data' 
                        })
                    };
                }
                
                console.log(`Updating master config with student ${studentId}`);
                
                // Fetch current master config
                const masterResp = await fetch(`${API_BASE}/${masterGistId}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!masterResp.ok) {
                    console.error('Failed to fetch master:', masterResp.status);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Failed to update class data' 
                        })
                    };
                }
                
                const masterData = await masterResp.json();
                const configData = JSON.parse(masterData.files['csci3403-config.json'].content);
                
                // Add/update student
                if (!configData.students) {
                    configData.students = {};
                }
                configData.students[studentId] = gistId;
                configData.lastUpdated = new Date().toISOString();
                
                // Update master gist
                const updateResp = await fetch(`${API_BASE}/${masterGistId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            'csci3403-config.json': {
                                content: JSON.stringify(configData, null, 2)
                            }
                        }
                    })
                });
                
                if (!updateResp.ok) {
                    console.error('Failed to update master:', updateResp.status);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Failed to update class data' 
                        })
                    };
                }
                
                console.log('Master config updated');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        action: 'updateMaster',
                        message: 'Class data updated successfully'
                    })
                };
                
            default:
                console.error('Unknown action:', action);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        success: false,
                        error: 'Invalid operation' 
                    })
                };
        }
        
    } catch (error) {
        // Log full error server-side only
        console.error('Function error:', error.message);
        console.error('Stack:', error.stack);
        
        // Return generic error to client
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Operation failed. Please try again.' 
            })
        };
    }
};