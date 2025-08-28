-- Create enum types for question types and confidence levels
CREATE TYPE question_type AS ENUM ('multiple_choice', 'short_answer');
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');

-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  lesson_text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL DEFAULT 0,
  mcq_count INTEGER NOT NULL DEFAULT 0,
  short_answer_count INTEGER NOT NULL DEFAULT 0,
  time_limit INTEGER, -- in minutes
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  order_number INTEGER NOT NULL,
  points DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  -- For MCQ questions
  options JSONB, -- Array of options: ["option1", "option2", "option3", "option4"]
  correct_answer_index INTEGER, -- Index of correct option (0-based)
  -- For short answer questions
  sample_answer TEXT, -- Teacher's sample answer for grading reference
  grading_rubric TEXT, -- Optional grading criteria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT questions_mcq_check CHECK (
    (question_type = 'multiple_choice' AND options IS NOT NULL AND correct_answer_index IS NOT NULL)
    OR 
    (question_type = 'short_answer' AND sample_answer IS NOT NULL)
  )
);

-- Create quiz submissions table
CREATE TABLE public.quiz_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  total_score DECIMAL(5,2),
  max_possible_score DECIMAL(5,2),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  needs_review BOOLEAN NOT NULL DEFAULT false, -- True if any low-confidence grades
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, student_id) -- One submission per student per quiz
);

-- Create question responses table
CREATE TABLE public.question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.quiz_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_answer TEXT NOT NULL,
  -- For MCQ: selected option index, for short answer: text response
  is_correct BOOLEAN, -- For MCQ: immediately known, for short answer: determined by AI
  points_earned DECIMAL(5,2),
  ai_feedback TEXT, -- AI-generated feedback for short answers
  confidence confidence_level, -- AI confidence in grading (for short answers)
  requires_manual_review BOOLEAN NOT NULL DEFAULT false,
  teacher_override_score DECIMAL(5,2), -- Manual score override by teacher
  teacher_feedback TEXT, -- Manual feedback from teacher
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quizzes
CREATE POLICY "Teachers can manage their own quizzes" ON public.quizzes 
  FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Students can view published quizzes" ON public.quizzes 
  FOR SELECT USING (is_published = true);

-- RLS Policies for questions
CREATE POLICY "Teachers can manage questions for their quizzes" ON public.questions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.created_by = auth.uid()
    )
  );
CREATE POLICY "Students can view questions for published quizzes" ON public.questions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND quizzes.is_published = true
    )
  );

-- RLS Policies for quiz submissions
CREATE POLICY "Students can manage their own submissions" ON public.quiz_submissions 
  FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view submissions for their quizzes" ON public.quiz_submissions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE quizzes.id = quiz_submissions.quiz_id 
      AND quizzes.created_by = auth.uid()
    )
  );

-- RLS Policies for question responses
CREATE POLICY "Students can manage their own responses" ON public.question_responses 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_submissions 
      WHERE quiz_submissions.id = question_responses.submission_id 
      AND quiz_submissions.student_id = auth.uid()
    )
  );
CREATE POLICY "Teachers can view/update responses for their quizzes" ON public.question_responses 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_submissions 
      JOIN public.quizzes ON quizzes.id = quiz_submissions.quiz_id
      WHERE quiz_submissions.id = question_responses.submission_id 
      AND quizzes.created_by = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX idx_quiz_submissions_quiz_id ON public.quiz_submissions(quiz_id);
CREATE INDEX idx_quiz_submissions_student_id ON public.quiz_submissions(student_id);
CREATE INDEX idx_question_responses_submission_id ON public.question_responses(submission_id);
CREATE INDEX idx_question_responses_question_id ON public.question_responses(question_id);