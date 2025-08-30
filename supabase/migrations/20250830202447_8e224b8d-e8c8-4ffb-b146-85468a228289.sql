-- Drop existing tables and create new simplified schema
DROP TABLE IF EXISTS question_responses CASCADE;
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

-- Create new simplified schema
CREATE TABLE quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  q jsonb, -- contains question_type, text, choices, model_answer, difficulty, weight
  created_at timestamptz DEFAULT now()
);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id),
  user_id uuid,
  answers jsonb, -- array of {questionId, answerText, choiceLabel}
  score numeric,
  graded jsonb, -- per-question grading info {id,score,max,confidence,explanation}
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for quizzes (public read)
CREATE POLICY "Anyone can view quizzes" ON quizzes FOR SELECT USING (true);

-- Create policies for questions (public read)
CREATE POLICY "Anyone can view questions" ON questions FOR SELECT USING (true);

-- Create policies for submissions (user can manage their own)
CREATE POLICY "Users can manage their own submissions" ON submissions 
FOR ALL USING (auth.uid() = user_id);

-- Insert sample quiz data
INSERT INTO quizzes (id, title, meta) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Sample Math Quiz', '{"description": "Basic arithmetic questions", "topic": "mathematics"}');

INSERT INTO questions (quiz_id, q) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '{
  "id": "q1",
  "type": "mcq",
  "difficulty": "easy",
  "question_text": "What is 2 + 2?",
  "choices": [
    {"label": "A", "text": "3", "is_correct": false},
    {"label": "B", "text": "4", "is_correct": true},
    {"label": "C", "text": "5", "is_correct": false}
  ],
  "rubric_explainer": "Basic addition",
  "weight": 1
}'),
('550e8400-e29b-41d4-a716-446655440000', '{
  "id": "q2",
  "type": "short",
  "difficulty": "medium",
  "question_text": "Explain the Pythagorean theorem.",
  "model_answer": "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides: a² + b² = c²",
  "rubric_explainer": "Should mention right triangle, hypotenuse, and the formula",
  "weight": 2
}');