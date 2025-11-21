# LabWise

LabWise is a next-generation Laboratory Information Management System (LIMS) built with modern web technologies. It is designed to streamline laboratory workflows, improve data accuracy, and enhance operational efficiency through intelligent automation and robust data management.

## Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **Authentication**: Custom JWT implementation using [jose](https://github.com/panva/jose)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) with Google AI
- **Testing**: [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/)

## Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Getting Started

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd labwise
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Setup:**

    Create a `.env` file in the root directory. You will need to define variables for MongoDB and JWT authentication.

    ```env
    MONGODB_URI=your_mongodb_connection_string
    MONGODB_DB=labwise
    JWT_SECRET_KEY=your_secret_key
    GOOGLE_GENAI_API_KEY=your_google_ai_key
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:9002`.

## Available Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack on port 9002.
- `npm run build`: Builds the application for production.
- `npm start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run typecheck`: Runs TypeScript compiler to check for type errors.
- `npm run genkit:dev`: Starts the Genkit developer UI for testing AI flows.

## Testing

This project uses **Jest** as the test runner and **React Testing Library** for component testing.

### Running Tests

- **Run all tests:**
  ```bash
  npm test
  ```

- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

### Testing Architecture

- **Configuration**: Jest is configured in `jest.config.ts`. It uses `jest-environment-jsdom` to simulate a browser environment for React components.
- **Setup**: `jest.setup.ts` includes global mocks and polyfills (e.g., `TextEncoder`, `TextDecoder`) required for libraries like `jose` to work in the test environment.
- **Path Aliases**: The `@/` alias is mapped to `src/` in tests, matching the Next.js configuration.

### Mocking Strategies

- **Authentication (`jose`)**: The `jose` library is ESM-only, which can cause issues in Jest. It is mocked in `src/lib/auth.test.ts` (and potentially globally if needed) to return predictable tokens without performing actual cryptographic operations.
- **AI Flows (Genkit)**: AI flows are mocked to prevent actual API calls to Google AI during testing. See `src/ai/flows/smart-data-entry.test.ts` for an example of how to mock `ai.definePrompt` and `ai.defineFlow`.

## Project Structure

```
src/
├── ai/             # Genkit AI flows and configuration
├── app/            # Next.js App Router pages and API routes
├── components/     # Reusable React components (UI and features)
├── context/        # React Context providers
├── hooks/          # Custom React hooks
├── lib/            # Utility functions, types, and database connection logic
└── docs/           # Project documentation and specifications
```
