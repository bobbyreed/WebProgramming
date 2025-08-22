exports.handler = async (event, context) => {
    console.log('Function invoked with method:', event.httpMethod);
    
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
        console.log('Request action:', data.action);
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
    
    const API_BASE = 'https://api.github.com/gists';
    const { action, studentId, gistId, updateData, masterGistId } = data;
    
    try {
        let response;
        
        switch(action) {
            case 'cleanup':
                // New cleanup action to verify and remove invalid gist entries
                if (!masterGistId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Master gist ID required for cleanup' 
                        })
                    };
                }
                
                console.log('Starting cleanup operation...');
                
                // Fetch current master config
                const masterResp = await fetch(`${API_BASE}/${masterGistId}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!masterResp.ok) {
                    console.error('Failed to fetch master config:', masterResp.status);
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Failed to fetch master config' 
                        })
                    };
                }
                
                const masterData = await masterResp.json();
                const config = JSON.parse(masterData.files['csci3403-config.json'].content);
                
                if (!config.students || Object.keys(config.students).length === 0) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: 'No students to verify',
                            removedStudents: [],
                            totalChecked: 0,
                            totalRemoved: 0
                        })
                    };
                }
                
                const removedStudents = [];
                const verifiedStudents = {};
                let totalChecked = 0;
                
                // Check each student's gist
                for (const [sid, gid] of Object.entries(config.students)) {
                    totalChecked++;
                    console.log(`Checking student ${sid} with gist ${gid}`);
                    
                    try {
                        // Try to fetch the gist
                        const checkResp = await fetch(`${API_BASE}/${gid}`, {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (checkResp.ok) {
                            // Gist exists, keep it
                            verifiedStudents[sid] = gid;
                            console.log(`✓ Student ${sid} gist is valid`);
                        } else if (checkResp.status === 404) {
                            // Gist not found, mark for removal
                            removedStudents.push({
                                studentId: sid,
                                gistId: gid,
                                reason: 'Gist not found (404)'
                            });
                            console.log(`✗ Student ${sid} gist not found`);
                        } else {
                            // Other error, keep it to be safe
                            verifiedStudents[sid] = gid;
                            console.log(`? Student ${sid} check returned ${checkResp.status}, keeping`);
                        }
                    } catch (checkError) {
                        // Network error, keep the student to be safe
                        verifiedStudents[sid] = gid;
                        console.error(`Error checking ${sid}:`, checkError.message);
                    }
                    
                    // Add a small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Update master config if any students were removed
                if (removedStudents.length > 0) {
                    config.students = verifiedStudents;
                    config.lastCleanup = new Date().toISOString();
                    config.cleanupStats = {
                        date: new Date().toISOString(),
                        checked: totalChecked,
                        removed: removedStudents.length,
                        remaining: Object.keys(verifiedStudents).length
                    };
                    
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
                                    content: JSON.stringify(config, null, 2)
                                }
                            }
                        })
                    });
                    
                    if (!updateResp.ok) {
                        console.error('Failed to update master config:', updateResp.status);
                        return {
                            statusCode: 500,
                            headers,
                            body: JSON.stringify({ 
                                success: false,
                                error: 'Failed to update master config after cleanup' 
                            })
                        };
                    }
                }
                
                console.log(`Cleanup complete: ${removedStudents.length} students removed`);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: `Cleanup complete: ${removedStudents.length} invalid entries removed`,
                        removedStudents: removedStudents,
                        totalChecked: totalChecked,
                        totalRemoved: removedStudents.length,
                        totalRemaining: Object.keys(verifiedStudents).length
                    })
                };
                
            case 'updateStudent':
                // Existing update student logic
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
                    console.error('GitHub API error:', response.status, errorText);
                    
                    return {
                        statusCode: 500,
                        headers,
                        body: JSON.stringify({ 
                            success: false,
                            error: 'Failed to update student data' 
                        })
                    };
                }
                
                console.log('Student data updated successfully');
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
                // Existing create gist logic
                console.log(`Creating new gist for student ${studentId}`);
                
                response = await fetch(API_BASE, {
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
                        
                        const masterResponse = await fetch(`${API_BASE}/${masterGistId}`, {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (masterResponse.ok) {
                            const masterGist = await masterResponse.json();
                            const configContent = masterGist.files['csci3403-config.json'].content;
                            const masterConfig = JSON.parse(configContent);
                            
                            if (!masterConfig.students) {
                                masterConfig.students = {};
                            }
                            masterConfig.students[studentId] = newGistId;
                            masterConfig.lastUpdated = new Date().toISOString();
                            
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
                                            content: JSON.stringify(masterConfig, null, 2)
                                        }
                                    }
                                })
                            });
                            
                            if (!updateResponse.ok) {
                                console.error('Failed to update master config:', updateResponse.status);
                            } else {
                                console.log('Master config updated');
                            }
                        }
                    } catch (masterError) {
                        console.error('Error updating master:', masterError);
                    }
                }
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        action: 'create',
                        message: 'Student profile created successfully',
                        gistId: newGistId
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
        console.error('Function error:', error.message);
        console.error('Stack:', error.stack);
        
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