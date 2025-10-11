const { getDB, successResponse, errorResponse, handleOptions } = require('./db-config');

exports.handler = async (event, context) => {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleOptions();
    }

    try {
        const sql = getDB();

        if (event.httpMethod === 'POST') {
            // Mark present/late
            const { studentId, date, isLate } = JSON.parse(event.body);

            if (!studentId || !date) {
                return errorResponse(new Error('Missing required fields: studentId, date'), 400);
            }

            // Upsert attendance record
            const result = await sql`
                INSERT INTO attendance (student_id, attendance_date, is_late)
                VALUES (${parseInt(studentId)}, ${date}, ${isLate || false})
                ON CONFLICT (student_id, attendance_date)
                DO UPDATE SET is_late = ${isLate || false}, timestamp = CURRENT_TIMESTAMP
                RETURNING id, student_id, attendance_date, is_late, timestamp
            `;

            return successResponse({
                message: 'Attendance marked successfully',
                attendance: result[0]
            });

        } else if (event.httpMethod === 'DELETE') {
            // Mark absent (delete record)
            const { studentId, date } = JSON.parse(event.body);

            if (!studentId || !date) {
                return errorResponse(new Error('Missing required fields: studentId, date'), 400);
            }

            const result = await sql`
                DELETE FROM attendance
                WHERE student_id = ${parseInt(studentId)} AND attendance_date = ${date}
                RETURNING id
            `;

            return successResponse({
                message: 'Attendance removed successfully',
                deleted: result.length > 0
            });

        } else {
            return errorResponse(new Error('Method not allowed'), 405);
        }

    } catch (error) {
        return errorResponse(error);
    }
};
