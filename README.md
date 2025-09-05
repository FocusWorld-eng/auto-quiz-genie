# Study with Focus - Interactive Quiz Platform

A modern, AI-powered educational platform that enables teachers to create intelligent quizzes and students to learn through interactive Q&A sessions.

## 🌟 Features

### For Teachers
- **AI Quiz Generation**: Create science quizzes automatically using OpenAI
- **Multiple Question Types**: Support for multiple-choice and short-answer questions
- **Automated Grading**: AI-powered grading with detailed feedback
- **Subject Specialization**: Physics, Chemistry, Biology, and Earth Science

### For Students
- **Interactive Quizzes**: Take quizzes with real-time progress tracking
- **AI Tutor**: Ask questions and get step-by-step explanations
- **Instant Results**: Get detailed feedback and scores immediately
- **Subject-Specific Help**: Get assistance in various science subjects

## 🚀 Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Edge Functions)
- **AI Integration**: OpenAI GPT for quiz generation and tutoring
- **Build Tool**: Vite
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: TanStack React Query
- **Routing**: React Router v6

## 📦 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── SimpleQuizGenerator.tsx    # Quiz creation interface
│   ├── SimpleQuizList.tsx         # Quiz listing component
│   ├── SimpleTakeQuiz.tsx         # Quiz taking interface
│   └── SimpleQuizResults.tsx      # Results display
├── pages/               # Route components
│   ├── Index.tsx        # Landing page and dashboard
│   ├── Auth.tsx         # Authentication page
│   ├── StudentQA.tsx    # Student Q&A interface
│   └── NotFound.tsx     # 404 page
├── hooks/               # Custom React hooks
│   └── useAuth.tsx      # Authentication logic
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
└── lib/                 # Utilities
    └── utils.ts         # Helper functions

supabase/
├── functions/           # Edge Functions
│   ├── generate-quiz/   # Quiz generation API
│   ├── grade/          # Quiz grading API
│   └── student-qa/     # Q&A tutoring API
└── config.toml         # Supabase configuration
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/FocusWorld-eng/Study-with-Focus.git
cd Study-with-Focus
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="your-supabase-url"
```

4. **Start development server**
```bash
npm run dev
```

## 🗄️ Database Schema

### Tables

**profiles**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `full_name`: Text
- `email`: Text
- `role`: Text (student/teacher)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**quizzes**
- `id`: UUID (Primary Key)
- `title`: Text
- `meta`: JSONB (description, topic, total_questions)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**questions**
- `id`: UUID (Primary Key)
- `quiz_id`: UUID (Foreign Key to quizzes)
- `text`: Text
- `type`: question_type enum (mcq/short_answer)
- `choices`: JSONB
- `correct_answer`: Text
- `difficulty`: confidence_level enum
- `weight`: Integer
- `created_at`: Timestamp

**submissions**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `quiz_id`: UUID (Foreign Key to quizzes)
- `answers`: JSONB
- `score`: Numeric
- `graded`: JSONB
- `submitted_at`: Timestamp

## 🔧 API Endpoints (Edge Functions)

### Generate Quiz
**POST** `/functions/v1/generate-quiz`
```json
{
  "topicText": "string",
  "course": "physics|chemistry|biology|earth_science",
  "difficulty": "easy|medium|hard",
  "numQuestions": number
}
```

### Grade Submission
**POST** `/functions/v1/grade`
```json
{
  "submissionId": "uuid"
}
```

### Student Q&A
**POST** `/functions/v1/student-qa`
```json
{
  "question": "string",
  "subject": "physics|chemistry|biology|earth_science"
}
```

## 🔐 Authentication & Authorization

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row Level Security (RLS) policies
- **User Roles**: Teacher and Student roles with different permissions

### RLS Policies
- Users can only access their own data
- Quizzes are public (readable by all authenticated users)
- Submissions are private to the user who created them

## 🎨 Design System

The app uses a custom design system built with Tailwind CSS:
- **Colors**: HSL-based color tokens in CSS variables
- **Typography**: Inter font family with semantic sizing
- **Components**: Consistent styling through shadcn/ui components
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Full dark mode support

## 🚀 Deployment

### Using Lovable (Recommended)
1. Open your project in Lovable
2. Click "Publish" in the top right
3. Your app will be deployed automatically

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Set up environment variables in your hosting platform
4. Configure Supabase Edge Functions deployment

## 🔑 Environment Variables

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key (set in Supabase secrets)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## 📝 Usage

### For Teachers
1. Sign up with a teacher account
2. Generate quizzes by providing topic content
3. View quiz results and analytics
4. Monitor student progress

### For Students
1. Sign up with a student account
2. Browse available quizzes
3. Take quizzes and receive instant feedback
4. Ask questions to the AI tutor

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common issues

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- AI-powered quiz generation
- Student Q&A system
- Authentication and authorization
- Responsive design
- Dark mode support

---

Built with ❤️ using React, Supabase, and OpenAI