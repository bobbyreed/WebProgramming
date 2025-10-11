const { getDB, successResponse, errorResponse, handleOptions } = require('./db-config');

exports.handler = async (event, context) => {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleOptions();
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return errorResponse(new Error('Method not allowed'), 405);
    }

    try {
        const { firstName, lastName, fullName, rawCardData } = JSON.parse(event.body);

        // Validate input
        if (!firstName || !lastName || !fullName) {
            return errorResponse(new Error('Missing required fields: firstName, lastName, fullName'), 400);
        }

        const sql = getDB();

        // Insert student
        const result = await sql`
            INSERT INTO students (first_name, last_name, full_name, card_data)
            VALUES (${firstName}, ${lastName}, ${fullName}, ${rawCardData || null})
            RETURNING id, first_name, last_name, full_name, created_at
        `;

        return successResponse({
            message: 'Student registered successfully',
            student: result[0]
        });

    } catch (error) {
        // Check for duplicate
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            return errorResponse(new Error('Student already registered'), 409);
        }

        return errorResponse(error);
    }
};
