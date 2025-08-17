# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a college management system for "COLLEGE POLYVALENT BILINGUE DE DOUALA" with three main components:

- **back/**: Node.js/TypeScript backend API server using Express (port 4000)
- **front/**: React frontend application (Create React App, port 3006)
- **cli/**: Command-line interface for administrative tasks
- **docs/**: PDF reports and documentation storage

## Development Commands

### Backend (back/)

```bash
cd back
npm run start          # Start development server with nodemon on port 4000
npm run create_school   # Initialize school database schema
```

### Frontend (front/)

```bash
cd front
npm start              # Start React dev server on port 3006
npm run build          # Build for production
npm test               # Run tests
```

### CLI (cli/)

```bash
cd cli
npm run createschool     # Create new school setup interactively
npm run createsuperuser  # Create admin user interactively
```

## Architecture Overview

### Backend Architecture

- **MVC Pattern**: Controllers handle business logic, routes define endpoints
- **Database**: MySQL (`sem` database) with mysql2 driver
- **Authentication**: JWT tokens with bcrypt password hashing, role-based middleware
- **File Handling**: PDF generation (pdf-creator-node), CSV parsing, file uploads with multer
- **Email**: Nodemailer for sending reports and notifications
- **Server**: Express with CORS enabled for cross-origin requests

### Key Backend Features

- **Multi-role Authentication**: Admin, teacher, accountant access levels
- **PDF Report Generation**: Bulletins, receipts, student lists, age tables, financial reports
- **Data Import/Export**: CSV handling for bulk student data operations
- **File Management**: Document storage in `docs/` with organized receipt and report generation

### Frontend Architecture

- **React 18**: Modern React with functional components and hooks
- **UI Framework**: Bootstrap 5 + Reactstrap + React Bootstrap Icons
- **Routing**: React Router v6 for SPA navigation
- **State Management**: Local state with API integration via axios
- **Internationalization**: French/English language support via `local/lang.js`
- **Responsive Design**: Mobile-first approach with custom CSS

### Database Schema (key tables)

- **Students**: Personal info, class assignments, fee tracking, academic records
- **Teachers**: Subject assignments, login credentials
- **Classes/Sections**: Academic structure organization
- **Payments**: Financial tracking with receipt generation (`payments_details`)
- **Grades**: Sequences, trimesters, annual exams by academic domain

### API Patterns

- RESTful endpoints organized by feature (`/students`, `/teachers`, `/classes`, etc.)
- Form validation with French error messages
- File upload handling for imports and document management
- PDF generation for various administrative documents

## Key Features

- **Academic Management**: Complete student lifecycle from enrollment to graduation
- **Financial Tracking**: Fee payments, receipt generation, financial reporting
- **Grade Management**: Sequence/trimester/annual exam tracking with bulletin generation
- **Multi-language**: French (primary) and English interface support
- **Document Generation**: Automated PDF reports for administrative tasks
- **Data Import**: CSV import for bulk student registration

## Students Import API Routes

### Recommended Routes (Series-Specific)

#### Import for Specific Series
- **POST** `/api/students/series/{seriesId}/import`
  - Accepts: Excel (.xlsx, .xls) and CSV files
  - Max size: 2048KB
  - Series ID in URL path (no body parameter needed)
  
- **POST** `/api/students/series/{seriesId}/import/csv`  
  - Accepts: CSV (.csv, .txt) files only
  - Max size: 2048KB
  - Series ID in URL path (no body parameter needed)

#### CSV Format Required
```csv
id,nom,prenom,date_naissance,lieu_naissance,sexe,nom_parent,telephone_parent,email_parent,adresse,statut_etudiant,statut
,DUPONT,Jean,01/01/2010,Douala,M,Marie DUPONT,123456789,marie@example.com,Douala,nouveau,1
123,MARTIN,Sophie,15/06/2009,Yaoundé,F,Paul MARTIN,987654321,paul@example.com,Yaoundé,ancien,0
```

#### Import Logic
- **Empty ID**: Creates new student with auto-generated matricule
- **Provided ID**: Updates existing student (must exist in same school year)
- **Status**: `1` = Active, `0` = Inactive
- **Series**: Automatically assigned from URL parameter
- **School Year**: Uses user's working year

### Legacy Routes (Deprecated)
- **POST** `/api/students/import/excel` (requires `class_series_id` in body)
- **POST** `/api/students/import/csv` (requires `class_series_id` in body)

### Export Routes
- **GET** `/api/students/export/excel` - Global Excel export with filters
- **GET** `/api/students/export/csv` - Global CSV export with filters  
- **GET** `/api/students/export/pdf` - Global PDF export with filters
- **GET** `/api/students/export/importable` - CSV format ready for import
- **GET** `/api/students/template/download` - Download CSV template

## Environment Configuration

- Backend `.env` requires: `PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_HOST`, `SECRET`
- Database: MySQL server with `sem` database
- Frontend configured for port 3006, backend on port 4000
- File storage in `back/docs/` for generated documents
