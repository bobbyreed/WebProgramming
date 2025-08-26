exports.handler = async (event, context) => {
    console.log('Admin authentication function invoked');
    
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
    
    // Get admin password from environment variable
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    
    if (!ADMIN_PASSWORD) {
        console.error('Admin password not configured in environment');
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
    
    const { password } = data;
    
    if (!password) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Password is required' 
            })
        };
    }
    
    // Check if password matches environment variable
    if (password === ADMIN_PASSWORD) {
        console.log('Admin authentication successful');
        
        // Generate a session token (in production, use a proper JWT or session management)
        const sessionToken = Buffer.from(`admin_${Date.now()}_${Math.random()}`).toString('base64');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                authenticated: true,
                sessionToken: sessionToken,
                message: 'Admin authentication successful'
            })
        };
    } else {
        console.log('Admin authentication failed - invalid password');
        
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                authenticated: false,
                error: 'Invalid admin credentials'
            })
        };
    }
};