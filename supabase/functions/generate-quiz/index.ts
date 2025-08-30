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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { topicText, numQuestions = 5 } = await req.json();
    
    console.log('Generating quiz for topic:', topicText, 'with', numQuestions, 'questions');

    const systemPrompt = `You are an educational quiz generator. Output must be valid JSON ONLY.`;
    
    const userPrompt = `Generate ${numQuestions} questions from the following topic. Provide a JSON object with:
{
 "quiz_title": string,
 "questions": [
   {
    "id": string,
    "type": "mcq"|"short",
    "difficulty": "easy"|"medium"|"hard",
    "question_text": string,
    "choices": [ { "label":"A","text":"...", "is_correct": true/false }, ... ]  // only for mcq
    "model_answer": string,         // only for short
    "rubric_explainer": string,
    "weight": number
   }, ...
 ]
}
USER DATA: ${topicText}
Return only the JSON.`;

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
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
          description: `Quiz on ${topicText}`,
          topic: topicText,
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