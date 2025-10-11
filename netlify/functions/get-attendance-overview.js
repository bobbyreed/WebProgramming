const { getDB, successResponse, errorResponse, handleOptions } = require('./db-config');

// ==================== CLASS DATES ====================
// Update these dates to match your actual class schedule
// Format: YYYY-MM-DD
// Every Tuesday and Thursday from Aug 26 to Dec 11 (excluding Thanksgiving 11/27)

const CLASS_DATES = [
    '2025-08-26', // Class 1 - Tue
    '2025-08-28', // Class 2 - Thu
    '2025-09-02', // Class 3 - Tue
    '2025-09-04', // Class 4 - Thu
    '2025-09-09', // Class 5 - Tue
    '2025-09-11', // Class 6 - Thu
    '2025-09-16', // Class 7 - Tue
    '2025-09-18', // Class 8 - Thu
    '2025-09-23', // Class 9 - Tue
    '2025-09-25', // Class 10 - Thu
    '2025-09-30', // Class 11 - Tue
    '2025-10-02', // Class 12 - Thu
    '2025-10-07', // Class 13 - Tue
    '2025-10-09', // Class 14 - Thu
    '2025-10-14', // Class 15 - Tue
    '2025-10-16', // Class 16 - Thu
    '2025-10-21', // Class 17 - Tue
    '2025-10-23', // Class 18 - Thu
    '2025-10-28', // Class 19 - Tue
    '2025-10-30', // Class 20 - Thu
    '2025-11-04', // Class 21 - Tue
    '2025-11-06', // Class 22 - Thu
    '2025-11-11', // Class 23 - Tue
    '2025-11-13', // Class 24 - Thu
    '2025-11-18', // Class 25 - Tue
    '2025-11-20', // Class 26 - Thu
    '2025-11-25', // Class 27 - Tue
    // '2025-11-27', // Thanksgiving - NO CLASS
    '2025-12-02', // Class 28 - Tue
    '2025-12-04', // Class 29 - Thu
    '2025-12-09', // Class 30 - Tue
    '2025-12-11'  // Class 31 - Thu
];

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

        // Get all students
        const students = await sql`
            SELECT id, first_name, last_name, full_name
            FROM students
            ORDER BY last_name, first_name
        `;

        // Get all attendance records
        const allAttendance = await sql`
            SELECT student_id, attendance_date, is_late, timestamp
            FROM attendance
        `;

        // Build attendance map
        const attendanceMap = {};
        allAttendance.forEach(record => {
            const key = `${record.student_id}_${record.attendance_date}`;
            attendanceMap[key] = {
                isLate: record.is_late,
                timestamp: record.timestamp
            };
        });

        // Build response for each student
        const studentsWithAttendance = students.map(student => {
            const attendance = {};

            CLASS_DATES.forEach(date => {
                const key = `${student.id}_${date}`;
                attendance[date] = attendanceMap[key] || null;
            });

            return {
                id: student.id,
                firstName: student.first_name,
                lastName: student.last_name,
                fullName: student.full_name,
                attendance
            };
        });

        return successResponse({
            students: studentsWithAttendance,
            classDates: CLASS_DATES,
            totalClasses: CLASS_DATES.length
        });

    } catch (error) {
        return errorResponse(error);
    }
};
