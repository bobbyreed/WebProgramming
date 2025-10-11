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
        const { date } = event.queryStringParameters;

        if (!date) {
            return errorResponse(new Error('Missing date parameter'), 400);
        }

        const sql = getDB();

        const attendance = await sql`
            SELECT
                a.id,
                a.student_id,
                a.attendance_date,
                a.timestamp,
                a.is_late,
                s.first_name,
                s.last_name,
                s.full_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.attendance_date = ${date}
            ORDER BY s.last_name, s.first_name
        `;

        return successResponse({
            date,
            attendance,
            count: attendance.length
        });

    } catch (error) {
        return errorResponse(error);
    }
};
