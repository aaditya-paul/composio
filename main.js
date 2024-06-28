const Composio = require("composio");
const LangchainLLM = require("langchain-llm");
const GeminiAI = require("gemini-ai");

// Initialize Composio
const composio = new Composio();

// Initialize Langchain LLM
const langchainLLM = new LangchainLLM();

// Initialize Gemini AI
const geminiAI = new GeminiAI();

// Define Composio actions
const createGitHubIssueAction = composio.createAction(
  "CreateGitHubIssue",
  (issueTitle, issueBody) => {
    // Use Gemini AI to generate issue description
    const generatedDescription = geminiAI.generateText(issueBody);

    // Use Langchain LLM to create GitHub issue
    langchainLLM.createGitHubIssue(issueTitle, generatedDescription);
  }
);

// Define Composio tools
const githubTool = composio.createTool("GitHub", {
  createIssue: (issueTitle, issueBody) => {
    createGitHubIssueAction.execute(issueTitle, issueBody);
  },
});

// Register tools with Composio
composio.registerTool(githubTool);

// Use Composio to create a GitHub issue
composio.useTool("GitHub", (github) => {
  github.createIssue("New Issue", "This is the body of the issue.");
});
