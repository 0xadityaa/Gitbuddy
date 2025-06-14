
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { repoContent, repoName } = await req.json();

    if (!repoContent || !repoName) {
      throw new Error('Missing required fields: repoContent and repoName');
    }

    const prompt = `Analyze the following repository content and generate a comprehensive README.md file in GitHub flavored markdown syntax.

Repository: ${repoName}

The README should have the following structure:

1. # Project Name (extract from repository name or package.json)

2. ## Overview
   A short, to-the-point description about the repository/project based on the code analysis.

3. ## Setup
   Detailed instructions about setting up the repository by analyzing the tech stack used and how to run it locally. Include installation steps, dependencies, and build commands.

4. ## Environment Configuration
   If any APIs or environment configurations are needed, provide a .env template with placeholder values and descriptions based on the code analysis.

5. ## Features
   List all available project features in an ordered list format based on code analysis.

6. ## Tech Stack
   List the technologies, frameworks, and libraries used in the project based on package.json and code analysis.

7. ## Usage
   Basic usage instructions if applicable.

8. ## Contributing
   Standard contributing guidelines.

9. ## License
   Standard license section.

Repository Content:
${repoContent}

Please generate a professional, well-structured README.md that would be helpful for developers wanting to understand and contribute to this project. Focus on being accurate based on the actual code provided.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedReadme = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ generatedReadme }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-readme function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
