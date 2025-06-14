
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

    console.log(`Generating README for ${repoName}, content length: ${repoContent.length} characters`);

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

    // Make a single API call to Gemini with retry logic for rate limiting
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
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

        if (response.status === 429) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Rate limited, waiting before retry ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
            continue;
          }
        }

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        console.log(`API call failed, retrying ${attempts}/${maxAttempts}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedReadme = data.candidates[0].content.parts[0].text;

    console.log(`Successfully generated README for ${repoName}`);

    return new Response(JSON.stringify({ generatedReadme }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-readme function:', error);
    
    // Provide more specific error messages for rate limiting
    let errorMessage = error.message;
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.message.includes('429') ? 429 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
