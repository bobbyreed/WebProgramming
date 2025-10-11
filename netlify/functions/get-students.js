const { getDB, successResponse, errorResponse, handleOptions } = require('./db-config');

exports.handler = async (event, context) => {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleOptions();
    }

    // Only accept GET
    if (event.httpMethod !== 'GET') {
        return errorResponse(new Error('Method not allowed'), 405);
    }

    try {
        const sql = getDB();

        const students = await sql`
            SELECT id, first_name, last_name, full_name, card_data, created_at
            FROM students
            ORDER BY last_name, first_name
        `;

        return successResponse({
            students,
            count: students.length
        });

    } catch (error) {
        return errorResponse(error);
    }
};
