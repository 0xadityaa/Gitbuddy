## Overview

This project is a React application built with Vite, TypeScript, and Shadcn UI, leveraging Tailwind CSS for styling.  It features a user interface for interacting with GitHub repositories, allowing users to analyze repository structure, fetch file contents, and generate READMEs and Dockerfiles using Google's Gemini AI via a Supabase Edge Function. Authentication is handled through GitHub OAuth using Supabase.


## Setup

This project requires Node.js and npm (or yarn/pnpm) to be installed.  It's recommended to use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) for managing Node.js versions.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/0xadityaa/gitbuddy-dev
   ```

2. **Navigate to the project directory:**
   ```bash
   cd gitbuddy-dev
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure Supabase:**  You'll need a Supabase project set up with a GitHub OAuth provider and the `generate-readme` and `generate-dockerfile` Edge Functions deployed.  The `supabase/config.toml` file contains placeholder values for your Supabase project URL and publishable key.  Replace these with your actual credentials.  Also ensure the `GEMINI_API_KEY` environment variable is set. See [Environment Configuration](#environment-configuration) for details.


5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Environment Configuration

Create a `.env` file in the root of your project and populate it with the following:

```env
SUPABASE_URL=https://YOUR_SUPABASE_PROJECT_URL  # Your Supabase project URL
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY  # Your Supabase publishable key
GEMINI_API_KEY=YOUR_GEMINI_API_KEY # Your Google Gemini API key
```


## Features

- GitHub Authentication via OAuth.
- Repository selection from authenticated user's GitHub account.
- Repository directory structure visualization.
- Fetching and display of file contents from selected repository.
- README.md generation using Google's Gemini AI.
- Dockerfile and docker-compose.yml generation using Google's Gemini AI.
- Copy to clipboard functionality for generated content and directory structures.
- Error handling and user feedback via toasts.
- Responsive design using Tailwind CSS.


## Tech Stack

- **Frontend:** React, Vite, TypeScript, Shadcn UI, Tailwind CSS, React Router DOM, React Hook Form, TanStack Query
- **Backend (Edge Functions):** Supabase, Google Gemini AI
- **Styling:** Tailwind CSS


## Usage

1.  Sign in with your GitHub account.
2.  Select a repository from the dropdown menu.
3.  Click "Analyze Repository" to view the directory structure and estimated token count.
4.  Click "Fetch All Files Content" to retrieve and display the content of all files.
5.  Use the "Generate README" or "Generate Dockerfile" buttons to generate respective files using Gemini AI.
6.  Copy the generated content to your clipboard.


## Contributing

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Test your changes thoroughly.
5.  Commit your changes with clear and concise commit messages.
6.  Push your branch to your forked repository.
7.  Create a pull request to merge your changes into the main branch.


## License

MIT License.  See the `LICENSE` file for details.
