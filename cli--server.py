from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import threading
import queue

app = Flask(__name__)
CORS(app)

# Queue for commands and results
cmd_queue = queue.Queue()
res_queue = queue.Queue()

# Start a persistent shell
shell = subprocess.Popen(
    ["bash"],  # or "cmd" on Windows
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    universal_newlines=True,
)

# Function to continuously read shell output
def read_output():
    for line in shell.stdout:
        res_queue.put(line)
    shell.stdout.close()

threading.Thread(target=read_output, daemon=True).start()

@app.route("/run", methods=["POST"])
def run():
    data = request.get_json()
    command = data.get("command")
    if not command.endswith("\n"):
        command += "\n"
    try:
        # send command to persistent shell
        shell.stdin.write(command)
        shell.stdin.flush()

        # collect output until prompt appears (simple heuristic)
        output = ""
        while True:
            try:
                line = res_queue.get(timeout=0.1)
                output += line
                if line.strip().endswith("$") or line.strip().endswith("#"):
                    break
            except queue.Empty:
                break

        return jsonify({
            "stdout": output,
            "stderr": "",
            "returncode": 0
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=3050)
