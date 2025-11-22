// Name: Terminal (v3)
// ID: twTerminalV3
// Description: Fully stable terminal extension for TurboWarp.
// License: MIT

(function (Scratch) {
  "use strict";
  if (!Scratch.extensions.unsandboxed) throw new Error("Cannot load outside unsandboxed mode");

  const extensionId = "twTerminalV3";
  const { BlockType, ArgumentType, Cast } = Scratch;

  class Events {
    constructor() { this.blocks = {}; }
    add(name, block) { if (!this.blocks[name]) this.blocks[name] = []; this.blocks[name].push(block); }
    activate(name) { const blocks = this.blocks[name]; if (blocks) for (const block of blocks) Scratch.vm.runtime.startHats(block); }
  }

  class TerminalV3 {
    constructor() {
      this.events = new Events();
      this.lastOutput = "";
      this.lastError = "";
      this.lastExitCode = null;
      this.requestRunning = false;
      this.bridgeUrl = "http://127.0.0.1:3050/run";

      // bind all block functions
      this.runCommand = this.runCommand.bind(this);
      this.runCommandAsync = this.runCommandAsync.bind(this);
      this.whenOutput = this.whenOutput.bind(this);
      this.lastOutputBlock = this.lastOutputBlock.bind(this);
      this.lastErrorBlock = this.lastErrorBlock.bind(this);
      this.lastExitCodeBlock = this.lastExitCodeBlock.bind(this);
      this.requestRunningBlock = this.requestRunningBlock.bind(this);
      this.clearOutputBlock = this.clearOutputBlock.bind(this);
      this.setBridgeUrlBlock = this.setBridgeUrlBlock.bind(this);

      this.events.add("output", extensionId + "_whenOutput");

      Scratch.vm.runtime.on("RUNTIME_DISPOSED", () => { this.clearOutput(); });
    }

    getInfo() {
      return {
        id: extensionId,
        name: "Terminal",
        color1: "#4a90e2",
        color2: "#3a78c2",
        blocks: [
          { opcode: "runCommand", blockType: BlockType.REPORTER, text: "run command and wait [CMD]", arguments: { CMD: { type: ArgumentType.STRING, defaultValue: "ls" } } },
          { opcode: "runCommandAsync", blockType: BlockType.COMMAND, text: "run command async [CMD]", arguments: { CMD: { type: ArgumentType.STRING, defaultValue: "git status" } } },
          { opcode: "whenOutput", blockType: BlockType.EVENT, isEdgeActivated: false, text: "when terminal outputs" },
          { opcode: "lastOutputBlock", blockType: BlockType.REPORTER, text: "last terminal output" },
          { opcode: "lastErrorBlock", blockType: BlockType.REPORTER, text: "last terminal error" },
          { opcode: "lastExitCodeBlock", blockType: BlockType.REPORTER, text: "last exit code" },
          { opcode: "requestRunningBlock", blockType: BlockType.BOOLEAN, text: "command running?" },
          { opcode: "clearOutputBlock", blockType: BlockType.COMMAND, text: "clear terminal output" },
          { opcode: "setBridgeUrlBlock", blockType: BlockType.COMMAND, text: "set bridge url to [URL]", arguments: { URL: { type: ArgumentType.STRING, defaultValue: "http://127.0.0.1:3050/run" } } },
        ],
      };
    }

    async runCommand(args) {
      const cmd = Cast.toString(args.CMD);
      this.requestRunning = true;
      try {
        const res = await Scratch.fetch(this.bridgeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd }),
        });
        let data;
        try { data = await res.json(); } catch { data = { stdout: "", stderr: "", error: "invalid json response" }; }
        this.lastOutput = data.stdout || "";
        this.lastError = data.stderr || data.error || "";
        this.lastExitCode = typeof data.returncode === "number" ? data.returncode : null;
        this.events.activate("output");
      } catch (err) {
        this.lastOutput = "";
        this.lastError = String(err);
        this.lastExitCode = null;
        this.events.activate("output");
      } finally { this.requestRunning = false; }
      return this.lastOutput || this.lastError || "";
    }

    runCommandAsync(args) { (async () => { await this.runCommand(args); })(); }

    whenOutput() { /* event handler fires via Events */ }

    lastOutputBlock() { return this.lastOutput; }
    lastErrorBlock() { return this.lastError; }
    lastExitCodeBlock() { return this.lastExitCode === null ? "" : String(this.lastExitCode); }
    requestRunningBlock() { return Boolean(this.requestRunning); }
    clearOutputBlock() { this.lastOutput = ""; this.lastError = ""; this.lastExitCode = null; }
    setBridgeUrlBlock(args) { this.bridgeUrl = Cast.toString(args.URL); }
  }

  Scratch.extensions.register(new TerminalV3());
})(Scratch);
