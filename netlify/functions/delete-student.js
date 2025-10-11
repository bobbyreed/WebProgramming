const { getDB, successResponse, errorResponse, handleOptions } = require('./db-config');

exports.handler = async (event, context) => {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleOptions();
    }

    // Only accept DELETE
    if (event.httpMethod !== 'DELETE') {
        return errorResponse(new Error('Method not allowed'), 405);
    }

    try {
        const { id } = event.queryStringParameters;

        if (!id) {
            return errorResponse(new Error('Missing student id'), 400);
        }

        const sql = getDB();

        // Delete student (cascade will delete attendance records)
        const result = await sql`
            DELETE FROM students
            WHERE id = ${parseInt(id)}
            RETURNING id, full_name
        `;

        if (result.length === 0) {
            return errorResponse(new Error('Student not found'), 404);
        }

        return successResponse({
            message: 'Student deleted successfully',
            deleted: result[0]
        });

    } catch (error) {
        return errorResponse(error);
    }
};
