import "xterm/css/xterm.css";
import "./style.css";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { files } from "./files";

document.querySelector("#app").innerHTML = `
<div class="container">
  <div class="editor">
    <textarea>I am a textarea</textarea>
  </div>
  <div class="preview">
    <iframe src="loading.html"></iframe>
  </div>
  <div class="terminal"></div>
</div>
`;

let webcontainerInstance;

const iframeEl = document.querySelector("iframe");
const textareaEl = document.querySelector("textarea");
const terminalEl = document.querySelector(".terminal");

window.addEventListener("load", async () => {
  textareaEl.value = files["index.js"].file.contents;

  textareaEl.addEventListener("input", (e) => {
    writeIndexJS(e.currentTarget.value);
  });

  const fitAddon = new FitAddon()

  const terminal = new Terminal({
    convertEol: true,
  });

  terminal.loadAddon(fitAddon)
  terminal.open(terminalEl);
  fitAddon.fit()
  
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  webcontainerInstance.on("server-ready", (_port, url) => {
    iframeEl.src = url;
  });

  const shellProcess = await startShell(terminal);

  window.addEventListener('resize', () => {
    fitAddon.fit()
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows
    })
  })
});

async function startShell(terminal) {
  const shellProcess = await webcontainerInstance.spawn("jsh", {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
}

async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile("/index.js", content);
}
