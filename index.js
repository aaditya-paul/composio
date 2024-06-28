import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import {createOpenAIFunctionsAgent, AgentExecutor} from "langchain/agents";
import {pull} from "langchain/hub";
import {LangchainToolSet} from "composio-core";
import "dotenv/config";
import {GenerativeAgent} from "langchain/experimental/generative_agents";
const toolset = new LangchainToolSet({apiKey: process.env.COMPOSIO_API_KEY});

async function setupUserConnectionIfNotExists(entityId) {
  const entity = await toolset.client.getEntity(entityId);
  const connection = await entity.getConnection("github");

  if (!connection) {
    // If this entity/user hasn't already connected the account
    const connection = await entity.initiateConnection("github");
    console.log("Log in via: ", connection.redirectUrl);
    return connection.waitUntilActive(60);
  } else {
    console.log(connection.id, " already connected");
    return connection;
  }
}

async function executeGithubAgent(entityName) {
  // Create entity and get tools
  const entity = await toolset.client.getEntity(entityName);
  await setupUserConnectionIfNotExists(entity.id);
  const tools = await toolset.get_actions(
    {actions: ["github_issues_create"]},
    entity.id
  );

  // // Create an agent
  const prompt = await pull("hwchase17/openai-functions-agent");
  // const llm = new GenerativeAgent({
  //   model: "gpt-4",
  //   apiKey: process.env.OPEN_AI_API_KEY,
  // });

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
  });

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools: tools,
    prompt,
  });
  const agentExecutor = new AgentExecutor({agent, tools, verbose: true});

  // Invoke the agent
  const body =
    "TITLE: HELLO WORLD, DESCRIPTION: HELLO WORLD for the repo - aaditya-paul/clever-books";
  const result = await agentExecutor.invoke({
    input:
      "Please create another github issue with the summary and description with the following details of another issue:- , " +
      body,
  });

  console.log(result.output);
}

// setupUserConnectionIfNotExists();
executeGithubAgent("aaditya-paul");
