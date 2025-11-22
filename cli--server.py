from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import threading
import queue
import platform
import os
import sys

def detect_os():
    system = platform.system()
    
    # Windows
    if system == "Windows":
        return "windows"

    # macOS
    if system == "Darwin":
        return "mac"

    # Android (Termux, Pydroid etc)
    if system == "Linux":
        if "ANDROID_DATA" in os.environ:
            return "android"
        if "PYDROID_APP" in os.environ:
            return "android"
        if "/data/data/" in sys.executable:
            return "android"
        return "linux"

    return "unknown"

real_os = detect_os()
print("Detected OS:", real_os)

# Pick correct shell
if real_os == "android":
    shelltype = "sh"   # Android/Termux/Pydroid
elif real_os == "linux":
    shelltype = "bash"
elif real_os == "windows":
    shelltype = "cmd"
else:
    shelltype = "sh"   # fallback

print("Using shell:", shelltype)

app = Flask(__name__)
CORS(app)

# Command output queue
res_queue = queue.Queue()

# Start persistent shell
shell = subprocess.Popen(
    [shelltype],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    universal_newlines=True,
)

# Read shell output continuously
def read_output():
    for line in shell.stdout:
        res_queue.put(line)

threading.Thread(target=read_output, daemon=True).start()

@app.route("/run", methods=["POST"])
def run():
    data = request.get_json()
    command = data.get("command", "")

    if not command.endswith("\n"):
        command += "\n"

    try:
        # write command to persistent shell
        shell.stdin.write(command)
        shell.stdin.flush()

        output = ""
        while True:
            try:
                line = res_queue.get(timeout=0.1)
                output += line
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
