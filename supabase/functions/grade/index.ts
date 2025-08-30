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

    let totalScore = 0;
    let maxPossibleScore = 0;
    const gradedResults: any[] = [];

    for (const question of questions) {
      const questionData = question.q;
      const answer = submission.answers?.find((a: any) => a.questionId === questionData.id);
      
      maxPossibleScore += questionData.weight || 1;
      
      if (!answer) {
        gradedResults.push({
          id: questionData.id,
          score: 0,
          max: questionData.weight || 1,
          confidence: 'high',
          explanation: 'No answer provided'
        });
        continue;
      }

      if (questionData.type === 'mcq') {
        // Multiple choice - exact match
        const correctChoice = questionData.choices?.find((c: any) => c.is_correct);
        const isCorrect = answer.choiceLabel === correctChoice?.label;
        const score = isCorrect ? (questionData.weight || 1) : 0;
        
        totalScore += score;
        gradedResults.push({
          id: questionData.id,
          score,
          max: questionData.weight || 1,
          confidence: 'high',
          explanation: isCorrect ? 'Correct answer!' : `Incorrect. The correct answer was ${correctChoice?.label}: ${correctChoice?.text}`
        });
      } else {
        // Short answer - use AI to grade
        const gradingPrompt = `
Grade this short answer question:

Question: ${questionData.question_text}
Model Answer: ${questionData.model_answer}
Student Answer: ${answer.answerText}
Rubric: ${questionData.rubric_explainer}
Max Points: ${questionData.weight || 1}

Respond with JSON only:
{
  "score": number (0 to ${questionData.weight || 1}),
  "confidence": "high"|"medium"|"low",
  "explanation": "detailed explanation of grading"
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [
              { role: 'user', content: gradingPrompt }
            ],
            max_completion_tokens: 500,
          }),
        });

        if (!response.ok) {
          console.error('OpenAI grading error:', await response.text());
          // Fallback scoring
          gradedResults.push({
            id: questionData.id,
            score: Math.floor((questionData.weight || 1) * 0.5), // 50% fallback
            max: questionData.weight || 1,
            confidence: 'low',
            explanation: 'Auto-grading failed - manual review required'
          });
          totalScore += Math.floor((questionData.weight || 1) * 0.5);
          continue;
        }

        const gradingData = await response.json();
        let gradingResult;
        
        try {
          gradingResult = JSON.parse(gradingData.choices[0].message.content.trim());
        } catch {
          // Fallback if JSON parsing fails
          gradingResult = {
            score: Math.floor((questionData.weight || 1) * 0.7),
            confidence: 'low',
            explanation: 'Grading response parsing failed - manual review recommended'
          };
        }

        totalScore += gradingResult.score;
        gradedResults.push({
          id: questionData.id,
          score: gradingResult.score,
          max: questionData.weight || 1,
          confidence: gradingResult.confidence,
          explanation: gradingResult.explanation
        });
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
        graded: gradedResults
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