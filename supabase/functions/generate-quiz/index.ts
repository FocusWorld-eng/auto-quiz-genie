import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate quiz function called');
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: authHeader || ''
        }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User authenticated:', !!user, 'Auth error:', authError);
    
    if (!user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { topicText, course, difficulty, numQuestions = 5 } = await req.json();
    
    console.log('Generating quiz for:', { topicText, course, difficulty, numQuestions });

    const systemPrompt = `You are an expert ${course} educator. Generate comprehensive science quizzes with educational value.`;
    
    const userPrompt = `Generate ${numQuestions} ${difficulty} level questions for ${course} based on this content: "${topicText}"

Create a balanced mix of multiple choice (70%) and short answer (30%) questions that test:
- Conceptual understanding
- Problem-solving skills  
- Application of principles
- Scientific reasoning

Provide a JSON object with:
{
 "quiz_title": "Engaging title for ${course} quiz",
 "questions": [
   {
    "id": "q1",
    "type": "mcq"|"short",
    "difficulty": "${difficulty}",
    "question_text": "Clear, specific question",
    "choices": [ 
      { "label":"A", "text":"Option text", "is_correct": true/false },
      { "label":"B", "text":"Option text", "is_correct": false },
      { "label":"C", "text":"Option text", "is_correct": false },
      { "label":"D", "text":"Option text", "is_correct": false }
    ],  // only for mcq
    "model_answer": "Expected 2-3 sentence answer with key concepts",  // only for short
    "rubric_explainer": "Detailed grading criteria",
    "weight": 1
   }
 ]
}

Return only valid JSON.`;

    console.log('Making OpenAI API call with model: gpt-5-2025-08-07');
    console.log('API Key present:', !!openAIApiKey);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
      }),
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (response.status === 402) {
        throw new Error('Insufficient quota. Please check your OpenAI account billing.');
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();
    
    console.log('Generated content:', generatedContent);
    
    let quizData;
    try {
      quizData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Generated content is not valid JSON');
    }

    // Create quiz in database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: quizData.quiz_title,
        meta: { 
          description: `${difficulty} level ${course} quiz`,
          topic: course,
          course: course,
          difficulty: difficulty,
          total_questions: numQuestions
        }
      })
      .select()
      .single();

    if (quizError) {
      console.error('Quiz creation error:', quizError);
      throw quizError;
    }

    console.log('Created quiz:', quiz);

    // Insert questions
    const questionsToInsert = quizData.questions.map((question: any) => ({
      quiz_id: quiz.id,
      q: question
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions creation error:', questionsError);
      throw questionsError;
    }

    console.log('Quiz and questions created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        quiz_id: quiz.id,
        message: `Quiz "${quizData.quiz_title}" created successfully with ${numQuestions} questions.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});