# Web Programming Course Website

A comprehensive web-based course platform for undergraduate Web Programming, focusing on vanilla HTML, CSS, JavaScript, and modern web technologies.

🌐 **Live Site**: [webdev.abobbyreed.com](http://webdev.abobbyreed.com)

## 📚 Overview

This repository contains the complete course website for a web programming course. The site serves as both a teaching platform and a demonstration of web development best practices, built entirely with vanilla technologies to help students understand core web fundamentals.

## ✨ Features

### Course Content
- **31 Interactive Lecture Slideshows**: Comprehensive presentations covering the full web development stack
- **Progressive Learning Path**: From HTML basics to advanced JavaScript concepts
- **Hands-on Examples**: Live code demonstrations embedded within lectures
- **The Odin Project Integration**: Assignments aligned with industry-standard curriculum

### Student Engagement System
- **🏆 Live Leaderboard**: Real-time ranking system tracking student progress
- **🎖️ Achievement Badges**: Gamified learning with milestone rewards
- **📊 Points System**: Automated tracking of lecture views and activities
- **📈 Progress Tracking**: Individual student dashboards with engagement metrics

### Technical Features
- **Responsive Design**: Fully mobile-compatible across all devices
- **Dark/Light Theme**: User-selectable theme with system preference detection
- **Offline-First**: Progressive enhancement for reliability
- **Accessibility**: WCAG compliant with proper semantic HTML

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup with accessibility in mind
- **CSS3**: Custom properties, flexbox, grid, and animations
- **Vanilla JavaScript**: No frameworks - teaching fundamentals first

### Backend & Services
- **GitHub Gists**: Student data storage using public/private gist architecture
- **Netlify Functions**: Serverless functions for secure data updates
- **GitHub Pages**: Primary hosting platform

## 📁 Project Structure

```
/
├── index.html                 # Main course homepage
├── pages/                     # Lecture slides and content
|   |-- lectures/
│      ├── 1CourseIntro.html    # Course introduction
│      ├── 2HowTheWebWorks.html # Internet fundamentals
│      ├── 3HTMLElementsAndTags.html
│      ├── ...                   # 32 total lecture files
|   |-- notes/
│      ├── 1CourseIntro.html    # Course introduction
│      ├── 2HowTheWebWorks.html # Internet fundamentals
│      ├── 3HTMLElementsAndTags.html
│      ├── ...                   # 32 total lecture files
|  |-- inotes/   #Instructor notes
│      ├── 1CourseIntro.html    # Course introduction
│      ├── 2HowTheWebWorks.html # Internet fundamentals
│      ├── 3HTMLElementsAndTags.html
│      ├── ...                   # 32 total lecture files
│   ├── leaderboard.html      # Student ranking system
│   └── achievementBadges.html # Gamification page
├── styles/
│   ├── presentation.css      # Lecture slide styles
│   └── main.css              # Global styles
├── js/
│   ├── presentation.js       # Slide navigation system
│   ├── auth.js              # Student authentication
│   └── leaderboard.js       # Points and ranking logic
├── images/                   # Course assets and icons
└── LICENSE                   # MIT License

```
## 📖 Course Topics

### Foundation (Weeks 1-4)
- How the Web Works
- HTML Elements & Tags
- HTML Boilerplate
- Working with Text
- Lists, Links, and Images
- Git & GitHub Fundamentals

### Styling (Weeks 5-8)
- CSS Foundations
- The Cascade & Specificity
- Box Model
- Flexbox Layouts
- Landing Page Project

### Programming (Weeks 9-12)
- JavaScript Basics
- Variables & Operators
- Functions
- DOM Manipulation
- Developer Tools

### Advanced Topics (Weeks 13-16)
- Arrays & Loops
- Objects
- Problem Solving
- Final Projects

## 🎮 Student Features

### Authentication System
Students authenticate using a simple PIN system:
- Class PIN for initial access
- Student ID for personalization
- Local storage for session persistence

### Points & Achievements
Points are awarded for:
- Viewing lectures (10 points each)
- Completing assignments
- Maintaining streaks
- Special achievements

### Leaderboard
Real-time rankings showing:
- Top 3 podium display
- Full class rankings
- Individual statistics
- Recent achievements

## 🔧 Configuration

### Environment Variables
For deployment, configure:
```javascript
MASTER_GIST_ID = 'your-master-gist-id'
GITHUB_TOKEN = 'your-github-token' // For Netlify functions
```
*IT IS VERY IMPORTANT TO HIDE YOUR TOKEN IN A THIRD PARTY FUNCTION. IN THELIVE SITE I"M USING NETLIFY FUNCTIONS*

### Customization
- Update `MASTER_GIST_ID` in auth.js for your class
- Modify badge definitions in achievementBadges.html
- Adjust point values in the scoring system
- Customize themes in CSS variables

## 📝 Instructor Guide

### Setting Up a New Semester

1. **Create Master Gist**
   - Create a public GitHub Gist with `csci3403-config.json`
   - Include class PIN and semester information

2. **Deploy Site**
   - Fork this repository
   - Enable GitHub Pages
   - Configure custom domain (optional)

3. **Student Onboarding**
   - Share class PIN with students
   - Students self-register on first visit
   - Monitor progress via leaderboard

### Managing Content

- **Add New Lectures**: Create HTML files in `pages/` following the template
- **Update Schedule**: Modify the course schedule in relevant pages
- **Track Progress**: View real-time student engagement on leaderboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- **[The Odin Project](https://www.theodinproject.com/)**: For excellent curriculum
- **[Oklahoma City University](https://www.okcu.edu/)**: For supporting innovative teaching methods
- **Students**: For feedback and engagement that shapes the course

*Building the next generation of web developers, one commit at a time.* 🚀
