import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizGenerationRequest {
  topic: string;
  lessonText: string;
  mcqCount?: number;
  shortAnswerCount?: number;
  title?: string;
  description?: string;
  timeLimit?: number;
}

interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer';
  options?: string[];
  correct_answer_index?: number;
  sample_answer?: string;
  grading_rubric?: string;
  points: number;
}

interface QuizGenerationResponse {
  quiz: {
    title: string;
    description: string;
    questions: QuizQuestion[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return new Response(JSON.stringify({ error: 'Only teachers can generate quizzes' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      topic,
      lessonText,
      mcqCount = 5,
      shortAnswerCount = 3,
      title,
      description,
      timeLimit
    }: QuizGenerationRequest = await req.json();

    if (!topic || !lessonText) {
      return new Response(JSON.stringify({ error: 'Topic and lesson text are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating quiz for topic: ${topic}`);

    const prompt = `You are an expert teacher creating a comprehensive quiz. Generate a quiz based on the following topic and lesson content.

**Topic:** ${topic}

**Lesson Content:**
${lessonText}

**Requirements:**
- Generate exactly ${mcqCount} multiple choice questions
- Generate exactly ${shortAnswerCount} short answer questions
- Each multiple choice question should have exactly 4 options
- Provide sample answers and grading rubrics for short answer questions
- Questions should test understanding, application, and analysis
- Vary difficulty levels from basic recall to higher-order thinking

**Return ONLY a valid JSON object in the following exact format:**

{
  "quiz": {
    "title": "Generated quiz title based on the topic",
    "description": "Brief description of what this quiz covers",
    "questions": [
      {
        "question_text": "Multiple choice question text here?",
        "question_type": "multiple_choice",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer_index": 0,
        "points": 1.0
      },
      {
        "question_text": "Short answer question text here?",
        "question_type": "short_answer",
        "sample_answer": "Expected answer or key points",
        "grading_rubric": "Criteria for grading this answer",
        "points": 2.0
      }
    ]
  }
}

**Important:** Return ONLY the JSON object, no additional text or formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are an expert teacher and quiz generator. Always return valid JSON responses only.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate quiz' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();
    
    console.log('Generated content:', generatedContent);

    let quizData: QuizGenerationResponse;
    try {
      quizData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', generatedContent);
      return new Response(JSON.stringify({ error: 'Invalid quiz format generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate the response structure
    if (!quizData.quiz || !quizData.quiz.questions || !Array.isArray(quizData.quiz.questions)) {
      console.error('Invalid quiz structure:', quizData);
      return new Response(JSON.stringify({ error: 'Invalid quiz structure generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save quiz to database
    const { data: quizRecord, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: title || quizData.quiz.title,
        description: description || quizData.quiz.description,
        topic,
        lesson_text: lessonText,
        created_by: user.id,
        total_questions: quizData.quiz.questions.length,
        mcq_count: quizData.quiz.questions.filter(q => q.question_type === 'multiple_choice').length,
        short_answer_count: quizData.quiz.questions.filter(q => q.question_type === 'short_answer').length,
        time_limit: timeLimit,
        is_published: false
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error saving quiz:', quizError);
      return new Response(JSON.stringify({ error: 'Failed to save quiz' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save questions to database
    const questionsToInsert = quizData.quiz.questions.map((question, index) => ({
      quiz_id: quizRecord.id,
      question_text: question.question_text,
      question_type: question.question_type,
      order_number: index + 1,
      points: question.points,
      options: question.question_type === 'multiple_choice' ? question.options : null,
      correct_answer_index: question.question_type === 'multiple_choice' ? question.correct_answer_index : null,
      sample_answer: question.question_type === 'short_answer' ? question.sample_answer : null,
      grading_rubric: question.question_type === 'short_answer' ? question.grading_rubric : null,
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Error saving questions:', questionsError);
      // Clean up quiz record if questions failed to save
      await supabase.from('quizzes').delete().eq('id', quizRecord.id);
      return new Response(JSON.stringify({ error: 'Failed to save quiz questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Quiz generated successfully with ID: ${quizRecord.id}`);

    return new Response(JSON.stringify({
      quiz: quizRecord,
      questions: questionsToInsert,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});