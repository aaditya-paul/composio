import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import {createOpenAIFunctionsAgent, AgentExecutor} from "langchain/agents";
import {pull} from "langchain/hub";
import {LangchainToolSet} from "composio-core";
import "dotenv/config";
import {Prompt} from "./prompt.js";

const toolset = new LangchainToolSet({apiKey: process.env.COMPOSIO_API_KEY});

async function setupUserConnectionIfNotExists(entityId) {
  try {
    const entity = await toolset.client.getEntity(entityId);
    const connection = await entity.getConnection("github");

    if (!connection) {
      // If this entity/user hasn't already connected the account
      const newConnection = await entity.initiateConnection("github");
      console.log("Log in via: ", newConnection.redirectUrl);
      return newConnection.waitUntilActive(60);
    } else {
      console.log(connection.id, " already connected");
      return connection;
    }
  } catch (error) {
    console.error("Error setting up user connection:", error);
    throw error;
  }
}

async function executeGithubAgent(entityName) {
  try {
    // Create entity and get tools
    const entity = await toolset.client.getEntity(entityName);
    await setupUserConnectionIfNotExists(entity.id);
    const tools = await toolset.get_actions(
      {actions: ["github_issues_create"]},
      entity.id
    );
    console.log("Tools:", tools);

    // Verify tools were retrieved successfully
    if (!tools || tools.length === 0) {
      throw new Error("No tools retrieved for the entity.");
    }

    // Create an agent
    const prompt = await pull("hwchase17/openai-functions-agent");

    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    });

    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools: tools,
      prompt,
    });

    const agentExecutor = new AgentExecutor({agent, tools});

    // Invoke the agent
    const result = await agentExecutor.invoke({
      input: Prompt,
    });

    console.log("Agent result:", result);

    // Raise issue in GitHub
    const githubIssueTool = tools.find(
      (tool) => tool.name === "github_issues_create"
    );
    if (!githubIssueTool) {
      throw new Error("GitHub issue creation tool not found.");
    }

    // Ensure the result contains the necessary information
    const issueTitle = result.output || "Default Issue Title";
    const issueBody = "This is the issue body."; // Customize as needed

    // Validate the input schema for the GitHub issue tool
    const toolInput = {
      owner: "aaditya-paul",
      repo: "clever-books",
      title: issueTitle,
      body: issueBody,
    };

    console.log("Invoking GitHub issue tool with:", toolInput);

    var issuePrompt = {
      "properties": {
        "owner": {
          "description":
            "The account owner of the repository. The name is not case sensitive.",
          "title": "aaditya-paul",
          "type": "string",
        },
        "repo": {
          "description":
            "The name of the repository without the `.git` extension. The name is not case sensitive.",
          "title": "clever-books",
          "type": "string",
        },
        "title": {
          "description": "The title of the issue.",
          "title": "hello world",
          "type": "string",
        },
      },
      "required": ["owner", "repo", "title"],
      "title": "issues_createRequest",
      "type": "object",
    };
    const issueResult = await githubIssueTool.invoke(toolInput);

    console.log("Issue raised successfully:", issueResult);
  } catch (error) {
    console.error("Error executing GitHub agent:", error);
  }
}

// Execute the agent
executeGithubAgent("aaditya-paul");
