# Attendance System Implementation Prompt

**Use this prompt to implement the attendance system in other course repositories.**

---

## Prompt for Claude:

I need you to implement a database-backed attendance management system for my course website and remove any old Gist-based login/leaderboard/achievement systems.

### Reference Implementation

Use this repository as a reference: https://github.com/bobbyreed/SoftwareEngineering

### My Course Details:

- **Course Name**: Web Programming
- **Course Number**: 3403
- **Instructor Name**: bobby reed
- **Number of Classes**: 31
- **Class Dates**: Every tuesday and thursday at 9:30 from aug 26th to dec 11th

### My Instructor Card Data:

**Card Swipe Output**: `%B6039500482025215^REED/BOBBY^2108701B00122548?;6039500482025215=2108701000122548?
`
**Extracted Pattern**: `REED/BOBBY`

### Database Configuration:

- **Neon Database Connection String**: `postgresql://neondb_owner:npg_M6pInHFy7QYi@ep-dark-sun-a82qu957-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Netlify Site**: webdev.abobbyreed.com

---

## Tasks to Complete:

### Phase 1: Remove Old Systems

1. Delete all files related to:

   - Gist-based authentication (`js/auth.js`, `netlify/functions/authenticate.js`, etc.)
   - Leaderboard system (`pages/leaderboard.html`, `netlify/functions/get-all-students.js`)
   - Achievement system (`pages/*Achievements*.html`, achievement tracking code)
   - Points/gamification features (`netlify/functions/update-points.js`)

2. Clean up `index.html`:
   - Remove auth login form and user info display
   - Remove leaderboard and achievement navigation buttons
   - Remove all authentication JavaScript functions
   - Remove auth.css stylesheet link
   - Remove auth.js script tag

### Phase 2: Implement Attendance System

#### Database Setup:

1. Create Neon PostgreSQL database
2. Run database schema to create `students` and `attendance` tables
3. Configure Netlify environment variable: `DATABASE_URL`

#### Files to Create:

**JavaScript:**

- `js/classroom-auth.js` - Instructor card swipe authentication (8-hour session)

**HTML Pages:**

- `pages/register-students.html` - Student registration with card swipe + manual entry
- `pages/attendance.html` - Daily attendance tracking
- `pages/attendance-overview.html` - Visual grid showing all classes

**Serverless Functions (8 functions):**

- `netlify/functions/db-config.js` - Database connection helper
- `netlify/functions/register-student.js` - Add students to database
- `netlify/functions/get-students.js` - Fetch all students
- `netlify/functions/delete-student.js` - Remove students
- `netlify/functions/mark-attendance.js` - Mark present/late/absent
- `netlify/functions/get-attendance.js` - Get attendance for specific date
- `netlify/functions/get-attendance-history.js` - Historical records
- `netlify/functions/get-attendance-overview.js` - Grid data with CLASS_DATES array

**Database:**

- `database-schema.sql` - Complete schema for backup

#### Configuration Updates:

1. Update `CLASS_DATES` array in `get-attendance-overview.js` with my class dates
2. Set `INSTRUCTOR_CARD_PATTERN` in `classroom-auth.js` to my card pattern
3. Update all page headers with my course name, number, and instructor info
4. Update `pages/quick.html` to reflect my course lectures (if it exists)

#### Dependencies:

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.3"
  }
}
```

### Phase 3: Testing Setup

1. Add mock data generator function to `register-students.html` (22 mock students)
2. Verify card swipe authentication works
3. Test student registration
4. Test attendance tracking (present/late/absent)
5. Verify overview grid displays correctly
6. Test CSV exports

---

## Implementation Notes:

### Card Swipe Format:

My card swipe should match this pattern: `%B...^LASTNAME/FIRSTNAME^...?`
Extract just the `LASTNAME/FIRSTNAME` part for `INSTRUCTOR_CARD_PATTERN`.

### Database Connection:

Use ONLY the connection string in DATABASE_URL:

```
postgresql://user:password@host/database?sslmode=require
```

NOT: `psql 'postgresql://...'` (don't include the psql command wrapper)

### Class Dates Array:

The `CLASS_DATES` array should contain strings in `'YYYY-MM-DD'` format for all class meetings.

### Late Tracking:

The system supports marking students as "late" - this shows as yellow in the overview grid (green = on time, yellow = late, gray = absent/future).

---

## Expected Deliverables:

After implementation, I should have:

1. ✅ Clean homepage without login/leaderboard features
2. ✅ Working student registration page (protected by card swipe)
3. ✅ Working attendance tracking page (protected by card swipe)
4. ✅ Visual overview showing all students × all classes in color-coded grid
5. ✅ CSV export functionality for student roster and attendance
6. ✅ Mock data generator for testing
7. ✅ All data persisting in Neon PostgreSQL
8. ✅ Deployed and working on Netlify

---

## Additional Requests:

[Add any specific customizations or additional features you want]

---

Please reference the complete implementation in the SoftwareEngineering repository and adapt it for my course details above. Use the ATTENDANCE_SYSTEM_SETUP.md file in that repository for detailed technical specifications.
