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

    const { submissionId } = await req.json();
    
    console.log('Grading submission:', submissionId);

    // Get submission and answers
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError) {
      console.error('Submission fetch error:', submissionError);
      throw submissionError;
    }

    // Get questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', submission.quiz_id);

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      throw questionsError;
    }

    console.log('Found', questions.length, 'questions and', submission.answers?.length || 0, 'answers');

    // Prepare quiz data for AI grading
    const quizJson = questions.map(q => q.q);
    const studentAnswers = submission.answers || [];

    // Use new comprehensive grading prompt
    const gradingInput = {
      quiz_json: quizJson,
      student_answers: studentAnswers
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are an objective grader. Output valid JSON ONLY.' 
          },
          { 
            role: 'user', 
            content: `Grade the student answers against the model answers. For each question return: { id, score, max, confidence (0-1), explanation }.
Also return overall: { total_score, max_score, overall_feedback }.
Input: ${JSON.stringify(gradingInput)}.
Rubric: follow question.rubric_explainer.
Return only JSON.` 
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI grading error:', await response.text());
      throw new Error('AI grading failed');
    }

    const gradingData = await response.json();
    let gradingResult;
    
    try {
      gradingResult = JSON.parse(gradingData.choices[0].message.content.trim());
      console.log('AI grading result:', gradingResult);
    } catch (parseError) {
      console.error('Failed to parse grading result:', parseError);
      throw new Error('Failed to parse AI grading response');
    }

    const { total_score: totalScore, max_score: maxPossibleScore, overall_feedback } = gradingResult;
    // Handle different possible response formats from AI
    let gradedResults = [];
    if (Array.isArray(gradingResult.questions)) {
      gradedResults = gradingResult.questions;
    } else if (Array.isArray(gradingResult)) {
      // If the whole result is an array of questions
      gradedResults = gradingResult;
    } else {
      // Look for any array in the response that contains question results
      for (const key of Object.keys(gradingResult)) {
        if (Array.isArray(gradingResult[key]) && gradingResult[key].length > 0 && gradingResult[key][0].id) {
          gradedResults = gradingResult[key];
          break;
        }
      }
    }

    // Update submission with grading results
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        score: totalScore,
        graded: gradedResults
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Submission update error:', updateError);
      throw updateError;
    }

    console.log('Grading completed. Total score:', totalScore, '/', maxPossibleScore);

    return new Response(
      JSON.stringify({ 
        success: true,
        totalScore,
        maxPossibleScore,
        graded: gradedResults,
        overall_feedback
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in grade function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});