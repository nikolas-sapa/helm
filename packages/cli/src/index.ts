#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { readConfig, writeConfig } from "./config.js";
import { collectFiles } from "./collect.js";

const program = new Command();
program.name("helm").description("Deploy internal agents to Helm").version("0.0.0");

const SAMPLE_AGENT = `import { defineAgent } from "@helm/agent";

export default defineAgent({
  async run(input, ctx) {
    // ctx.fetch is domain-gated; ctx.llm tells you the provider/model.
    return { echo: input };
  },
});
`;

program
  .command("init")
  .description("scaffold a sample agent.ts in the current directory")
  .action(() => {
    const path = join(process.cwd(), "agent.ts");
    writeFileSync(path, SAMPLE_AGENT, { flag: "wx" });
    console.log(`created ${path}`);
  });

program
  .command("deploy")
  .description("bundle the current directory and deploy it as an agent")
  .option("-n, --name <name>", "agent name", "my-agent")
  .option("-m, --model <model>", "model id")
  .action(async (opts: { name: string; model?: string }) => {
    const cfg = readConfig();
    const files = collectFiles(process.cwd());
    if (files.length === 0) {
      console.error("no deployable files found in this directory");
      process.exit(1);
    }
    if (!cfg.token) {
      console.error("no admin token set — run `helm auth <token>` first");
      process.exit(1);
    }
    const res = await fetch(`${cfg.apiUrl}/api/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-helm-admin": cfg.token },
      body: JSON.stringify({ name: opts.name, model: opts.model, files }),
    });
    if (!res.ok) {
      console.error(`deploy failed: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const out = (await res.json()) as { agentUrl: string; key: string; slug: string };
    console.log(`deployed: ${out.slug}`);
    console.log(`endpoint: ${out.agentUrl}`);
    console.log(`key (shown once): ${out.key}`);
  });

program
  .command("whoami")
  .description("show the configured Helm endpoint")
  .action(() => {
    const cfg = readConfig();
    console.log(`apiUrl: ${cfg.apiUrl}`);
    console.log(`token:  ${cfg.token ? "set" : "(none)"}`);
  });

program
  .command("auth <token>")
  .description("store the control-plane admin token used for deploys")
  .action((token: string) => {
    const cfg = readConfig();
    writeConfig({ ...cfg, token });
    console.log("admin token saved");
  });

program
  .command("set-url <url>")
  .description("point the CLI at a Helm control-plane")
  .action((url: string) => {
    const cfg = readConfig();
    writeConfig({ ...cfg, apiUrl: url });
    console.log(`apiUrl set to ${url}`);
  });

program.parseAsync();
