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

        const dates = await sql`
            SELECT DISTINCT attendance_date
            FROM attendance
            ORDER BY attendance_date DESC
        `;

        return successResponse({
            dates: dates.map(row => row.attendance_date),
            count: dates.length
        });

    } catch (error) {
        return errorResponse(error);
    }
};
