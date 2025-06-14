
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

    console.log(`Generating Docker files for ${repoName}, content length: ${repoContent.length} characters`);

    const prompt = `Analyze the following repository content and generate a production-ready Dockerfile and docker-compose.yml file based on the tech stack and project structure.

Repository: ${repoName}

Please provide both files with the following requirements:

1. **Dockerfile Requirements:**
   - Use appropriate base image for the detected tech stack
   - Multi-stage build if beneficial for optimization
   - Proper working directory setup
   - Copy files in optimal order for caching
   - Install dependencies efficiently
   - Set proper user permissions (non-root user)
   - Expose the correct port
   - Use proper CMD/ENTRYPOINT
   - Include health checks if applicable
   - Optimize for production (minimize image size)

2. **docker-compose.yml Requirements:**
   - Define the main application service
   - Include any required databases/services based on code analysis
   - Proper environment variable setup with .env file support
   - Correct port mapping
   - Volume mounts for development if needed
   - Network configuration if multiple services
   - Restart policies
   - Health checks
   - Include common services like Redis, PostgreSQL, etc. if detected in code

3. **Additional Considerations:**
   - Analyze package.json, requirements.txt, or similar files for dependencies
   - Check for database connections and include appropriate services
   - Look for environment variables and create proper .env template
   - Consider the build process (npm run build, etc.)
   - Add proper error handling and logging
   - Include development vs production configurations if beneficial

4. **Output Format:**
   Please provide your response in this exact format:
   
   \`\`\`dockerfile
   # Dockerfile content here
   \`\`\`
   
   \`\`\`yaml
   # docker-compose.yml content here
   \`\`\`
   
   \`\`\`env
   # .env.example content here (if environment variables are needed)
   \`\`\`

Repository Content:
${repoContent}

Generate production-ready, working Docker configuration that developers can immediately use to containerize and run this application.`;

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

    const generatedDockerFiles = data.candidates[0].content.parts[0].text;

    console.log(`Successfully generated Docker files for ${repoName}`);

    return new Response(JSON.stringify({ generatedDockerFiles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-dockerfile function:', error);
    
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
