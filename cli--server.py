from flask import Flask, request, jsonify
import subprocess
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.post("/run")
def run():
    data = request.get_json()
    command = data.get("command")
    try:
        result = subprocess.run(
            command, shell=True,
            capture_output=True, text=True
        )
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

app.run(host="127.0.0.1", port=3050)
