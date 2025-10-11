# Attendance Management System Setup Guide

This guide will help you implement a database-backed attendance management system with instructor card-swipe authentication and remove old Gist-based login/leaderboard/achievement systems.

## Overview

The attendance system provides:
- **Instructor Authentication**: Card swipe protection for administrative pages
- **Student Registration**: Database-backed student roster management
- **Attendance Tracking**: Mark students present/late with timestamps
- **Visual Overview**: 15-box grid showing attendance across all class periods
- **Export Functionality**: CSV exports of attendance data

## Prerequisites

1. **Neon PostgreSQL Database**: Sign up at https://neon.tech
2. **Netlify Hosting**: Deploy through https://netlify.com
3. **Instructor Card Data**: Magnetic stripe card for authentication

---

## Part 1: Remove Old Systems (If Applicable)

### Files to DELETE:

```bash
# Gist authentication and gamification
js/auth.js
styles/auth.css
pages/leaderboard.html
pages/userAchievements.html
pages/achievementBadges.html
netlify/functions/authenticate.js
netlify/functions/admin-auth.js
netlify/functions/get-all-students.js
netlify/functions/update-points.js
```

### Files to MODIFY:

**index.html** - Remove:
- `<link rel="stylesheet" href="./styles/auth.css">`
- Auth container section with login form
- User info display div
- Leaderboard & Achievements navigation buttons
- `handleLogin()` and `checkAuthStatus()` functions
- Login event listeners
- `<script src="./js/auth.js"></script>`

---

## Part 2: Database Setup

### Step 1: Create Neon Database

1. Sign up at https://console.neon.tech
2. Create a new project
3. Note your connection string (format: `postgresql://user:password@host/database`)

### Step 2: Run Database Schema

Execute this SQL in the Neon SQL Editor:

```sql
-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    card_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(first_name, last_name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(full_name);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN DEFAULT false,
    UNIQUE(student_id, attendance_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, attendance_date);
```

### Step 3: Configure Netlify Environment Variables

In Netlify dashboard → Site Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

**Important**: Use ONLY the connection string, not the `psql` command wrapper.

---

## Part 3: File Structure

Create the following directory structure:

```
project/
├── js/
│   └── classroom-auth.js          # Instructor card swipe auth
├── pages/
│   ├── attendance.html            # Daily attendance tracking
│   ├── register-students.html     # Student registration
│   └── attendance-overview.html   # Visual attendance grid
├── netlify/functions/
│   ├── db-config.js              # Database connection helper
│   ├── register-student.js       # Add students to database
│   ├── get-students.js           # Fetch all students
│   ├── delete-student.js         # Remove students
│   ├── mark-attendance.js        # Mark present/late/absent
│   ├── get-attendance.js         # Get attendance for a date
│   ├── get-attendance-history.js # Historical attendance data
│   └── get-attendance-overview.js # Grid data for all students
└── database-schema.sql           # Schema backup
```

---

## Part 4: Core Files

### 1. Instructor Authentication (`js/classroom-auth.js`)

**Purpose**: Card swipe authentication for attendance/registration pages

**Key Configuration**:
```javascript
// Update with your card swipe data
const INSTRUCTOR_CARD_PATTERN = 'LASTNAME/FIRSTNAME';
const AUTH_KEY = 'classroom_auth';
const AUTH_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
```

**Usage in HTML**:
```html
<script src="../js/classroom-auth.js"></script>
<script>
ClassroomAuth.initAuthUI({
    pageName: 'Page Name',
    onSuccess: function() {
        // Initialize page functionality
    }
});
</script>
```

### 2. Database Configuration (`netlify/functions/db-config.js`)

**Purpose**: Shared database connection utility

```javascript
const { neon } = require('@neondatabase/serverless');

function getDB() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL not configured');
    }
    return neon(connectionString);
}

function successResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: true, ...data })
    };
}

function errorResponse(error, statusCode = 500) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: false,
            error: error.message || 'An error occurred'
        })
    };
}

function handleOptions() {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
        },
        body: ''
    };
}

module.exports = { getDB, successResponse, errorResponse, handleOptions };
```

### 3. Class Schedule Configuration

**In `netlify/functions/get-attendance-overview.js`**, update class dates:

```javascript
const CLASS_DATES = [
    '2025-01-13', // Class 1
    '2025-01-15', // Class 2
    '2025-01-20', // Class 3
    // ... add all your class dates (15 total recommended)
    '2025-05-05'  // Class 15
];
```

### 4. Student Registration Page

**Key Features**:
- Card swipe registration
- Manual name entry
- CSV export
- Bulk delete
- Mock data generator (for testing)

**Card Swipe Parsing**:
```javascript
function parseCardData(rawData) {
    const match = rawData.match(/\^([^\/]+)\/([^\^]+)\^/);
    if (match) {
        const lastName = match[1].trim();
        const firstName = match[2].trim();
        return { lastName, firstName, fullName: `${firstName} ${lastName}` };
    }
    return null;
}
```

### 5. Attendance Tracking Page

**Key Features**:
- Date selector
- Card swipe check-in
- Manual toggle (click student card)
- Mark all present
- Reset day
- CSV export
- Historical view

**Mark Attendance**:
```javascript
async function markPresent(studentData, isLate = false) {
    const response = await fetch(`${API_BASE}/mark-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            date: getCurrentDate(),
            isLate: isLate
        })
    });
    return await response.json();
}
```

### 6. Attendance Overview Page

**Visual Grid Display**:
- 15 boxes per student (one per class)
- Green = Present (on time)
- Yellow = Late
- Gray = Absent or future class
- Hover for details
- Overall statistics

---

## Part 5: Serverless Functions

### Required Functions (8 total):

1. **db-config.js**: Database connection helper
2. **register-student.js**: POST - Add student to database
3. **get-students.js**: GET - Fetch all students
4. **delete-student.js**: DELETE - Remove student
5. **mark-attendance.js**: POST/DELETE - Mark present/late/absent
6. **get-attendance.js**: GET - Fetch attendance for specific date
7. **get-attendance-history.js**: GET - All dates with attendance records
8. **get-attendance-overview.js**: GET - Grid data for all students across all classes

### Common Function Structure:

```javascript
const { getDB, successResponse, errorResponse, handleOptions } = require('./db-config');

exports.handler = async (event, context) => {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleOptions();
    }

    // Only accept specific method
    if (event.httpMethod !== 'POST') {
        return errorResponse(new Error('Method not allowed'), 405);
    }

    try {
        const sql = getDB();

        // Your database logic here
        const result = await sql`SELECT * FROM students`;

        return successResponse({ data: result });
    } catch (error) {
        return errorResponse(error);
    }
};
```

---

## Part 6: Installation Steps

### Step 1: Install Dependencies

```bash
npm install @neondatabase/serverless
```

Add to `package.json`:
```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.3"
  }
}
```

### Step 2: Get Instructor Card Data

1. Open browser console on any page
2. Create test input: `<input type="text" id="test" style="position:fixed;top:50%;left:50%;z-index:9999;font-size:20px;">`
3. Focus the input and swipe your card
4. Copy the value - look for pattern: `%B...^LASTNAME/FIRSTNAME^...?`
5. Extract: `LASTNAME/FIRSTNAME`

### Step 3: Update Configuration Files

1. **js/classroom-auth.js**: Update `INSTRUCTOR_CARD_PATTERN`
2. **netlify/functions/get-attendance-overview.js**: Update `CLASS_DATES` array
3. **pages/attendance-overview.html**: Update course title and info
4. **All HTML files**: Update course name, number, and instructor info

### Step 4: Deploy to Netlify

```bash
# Commit changes
git add .
git commit -m "Add attendance management system"
git push

# Netlify will auto-deploy
```

### Step 5: Verify Database Connection

Test the connection:
```bash
# In Netlify Functions logs, check for:
✓ Database connected successfully
```

If error `Database connection string provided to 'neon()' is not a valid URL`:
- Check DATABASE_URL doesn't have `psql` prefix or quotes
- Should be: `postgresql://...` (just the URL)

---

## Part 7: Testing Checklist

### Student Registration:
- [ ] Card swipe registers students
- [ ] Manual name entry works
- [ ] Duplicate detection prevents re-registration
- [ ] CSV export generates valid file
- [ ] Delete student removes from database

### Attendance Tracking:
- [ ] Card swipe marks students present
- [ ] Date selector changes attendance view
- [ ] Manual toggle switches present/absent
- [ ] Mark all present button works
- [ ] Reset day clears attendance
- [ ] CSV export includes all data

### Attendance Overview:
- [ ] Grid shows all students
- [ ] Box colors match status (green/yellow/gray)
- [ ] Hover tooltips show details
- [ ] Statistics calculate correctly
- [ ] Future classes show as gray

### Authentication:
- [ ] Instructor card swipe grants access
- [ ] Session persists for 8 hours
- [ ] Pages are locked without authentication
- [ ] Invalid cards are rejected

---

## Part 8: Mock Data for Testing

Add this function to `register-students.html` for testing:

```javascript
window.addMockStudents = async function() {
    const mockNames = [
        { firstName: 'Emma', lastName: 'Johnson' },
        { firstName: 'Liam', lastName: 'Williams' },
        { firstName: 'Olivia', lastName: 'Brown' },
        { firstName: 'Noah', lastName: 'Jones' },
        { firstName: 'Ava', lastName: 'Garcia' },
        { firstName: 'Ethan', lastName: 'Martinez' },
        { firstName: 'Sophia', lastName: 'Rodriguez' },
        { firstName: 'Mason', lastName: 'Davis' },
        { firstName: 'Isabella', lastName: 'Lopez' },
        { firstName: 'William', lastName: 'Gonzalez' },
        { firstName: 'Mia', lastName: 'Wilson' },
        { firstName: 'James', lastName: 'Anderson' },
        { firstName: 'Charlotte', lastName: 'Thomas' },
        { firstName: 'Benjamin', lastName: 'Taylor' },
        { firstName: 'Amelia', lastName: 'Moore' },
        { firstName: 'Lucas', lastName: 'Jackson' },
        { firstName: 'Harper', lastName: 'Martin' },
        { firstName: 'Henry', lastName: 'Lee' },
        { firstName: 'Evelyn', lastName: 'Perez' },
        { firstName: 'Alexander', lastName: 'White' },
        { firstName: 'Abigail', lastName: 'Harris' },
        { firstName: 'Michael', lastName: 'Clark' }
    ];

    console.log('🎭 Adding 22 mock students...');
    let successCount = 0;
    let failCount = 0;

    for (const student of mockNames) {
        try {
            const response = await fetch(`${API_BASE}/register-student`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: student.firstName,
                    lastName: student.lastName,
                    fullName: `${student.firstName} ${student.lastName}`,
                    rawCardData: null
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log(`✓ Registered: ${student.firstName} ${student.lastName}`);
                successCount++;
            } else {
                console.log(`✗ Failed: ${student.firstName} ${student.lastName} - ${data.error}`);
                failCount++;
            }
        } catch (error) {
            console.error(`✗ Error: ${student.firstName} ${student.lastName}:`, error);
            failCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Results: ${successCount} successful, ${failCount} failed`);
    await updateUI();
};
```

Call from browser console: `addMockStudents()`

---

## Part 9: Customization

### Update Course Information:

1. **index.html**: Course title, number, instructor, dates
2. **All attendance pages**: Header information
3. **Class dates array**: Match your actual schedule
4. **Number of classes**: Adjust from 15 if needed

### Styling:

All pages use `styles/presentation.css` with CSS variables:
- `--ocu-true-blue`: Primary color
- `--ocu-cyan`: Accent color
- `--bg-primary`: Background
- `--text-primary`: Text color
- Dark mode supported via `[data-theme="dark"]`

---

## Part 10: Troubleshooting

### Common Issues:

**Issue**: Database connection error
- **Fix**: Check DATABASE_URL format (no `psql` prefix, no quotes)

**Issue**: Functions return 500 error
- **Fix**: Check Netlify function logs for detailed error messages

**Issue**: Card swipe not working
- **Fix**: Verify INSTRUCTOR_CARD_PATTERN matches your card format

**Issue**: Students not appearing in overview
- **Fix**: Ensure CLASS_DATES array is populated and dates are correct

**Issue**: "Column is_late does not exist"
- **Fix**: Run the database migration: `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;`

**Issue**: Attendance overview shows all gray boxes
- **Fix**: Check that CLASS_DATES array dates are in past/present, not all future

---

## Part 11: Maintenance

### Adding New Students Mid-Semester:
- Use register-students.html to add via card swipe or manual entry
- They'll appear immediately in all attendance views

### Backing Up Data:
```sql
-- Export students
COPY (SELECT * FROM students) TO STDOUT WITH CSV HEADER;

-- Export attendance
COPY (SELECT * FROM attendance) TO STDOUT WITH CSV HEADER;
```

### Clearing All Data (Start of New Semester):
```sql
-- Delete all attendance records
DELETE FROM attendance;

-- Delete all students
DELETE FROM students;

-- Reset sequences
ALTER SEQUENCE students_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_id_seq RESTART WITH 1;
```

---

## Part 12: Quick Reference

### API Endpoints:

```
POST   /register-student      - Register new student
GET    /get-students          - Fetch all students
DELETE /delete-student        - Remove student
POST   /mark-attendance       - Mark student present/late
DELETE /mark-attendance       - Mark student absent
GET    /get-attendance        - Get attendance for date
GET    /get-attendance-history - Get all dates with records
GET    /get-attendance-overview - Get grid data for all students
```

### Database Tables:

```
students
  - id (serial, PK)
  - first_name (varchar)
  - last_name (varchar)
  - full_name (varchar)
  - card_data (text, nullable)
  - created_at (timestamp)

attendance
  - id (serial, PK)
  - student_id (integer, FK → students)
  - attendance_date (date)
  - timestamp (timestamp)
  - is_late (boolean)
```

---

## Summary

This system provides a complete, database-backed attendance management solution that replaces gamified Gist-based systems with professional, instructor-focused tools. The authentication uses physical card swipes for security, and all data is persistently stored in PostgreSQL with automatic backups.

**Total Implementation Time**: ~2-3 hours for a fresh install
**Dependencies**: Neon PostgreSQL, Netlify Functions, @neondatabase/serverless
**Files Created**: ~11 files (3 HTML, 1 JS, 1 CSS, 8 serverless functions)
**Database Tables**: 2 tables (students, attendance)

**Key Features**:
✅ Card swipe authentication
✅ Student roster management
✅ Daily attendance tracking
✅ Visual 15-class overview grid
✅ CSV exports
✅ Late tracking
✅ Historical data
✅ Mobile-responsive
✅ Dark mode support

---

## Appendix: Complete File Reference

See the current SoftwareEngineering repository for complete, working examples of all files:
- https://github.com/bobbyreed/SoftwareEngineering

Key files to reference:
- `js/classroom-auth.js` - Full authentication implementation
- `pages/attendance.html` - Complete attendance tracking page
- `pages/attendance-overview.html` - Visual grid implementation
- `pages/register-students.html` - Student registration with mock data
- `netlify/functions/*.js` - All 8 serverless functions
- `database-schema.sql` - Complete database schema
