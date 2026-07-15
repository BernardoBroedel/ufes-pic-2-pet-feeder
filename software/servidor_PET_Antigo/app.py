from flask import Flask, request, jsonify, render_template_string
from tf_keras.models import load_model
import numpy as np
from PIL import Image
import io
import os
import time

app = Flask(__name__, static_folder='static')

# Cria a pasta 'static' para salvar a foto se ela não existir
if not os.path.exists('static'):
    os.makedirs('static')

print("Carregando modelo de Inteligência Artificial...")
model = load_model("keras_model.h5", compile=False)

with open("labels.txt", "r") as f:
    class_names = f.readlines()
print("Modelo carregado com sucesso! Aguardando imagens...")

# Variáveis globais para guardar a última detecção
ultima_classe = "Aguardando..."
ultima_confianca = 0.0

# O visual da nossa página web
PAGINA_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Visão do Alimentador</title>
    <meta http-equiv="refresh" content="2"> <style>
        body { font-family: Arial; text-align: center; background-color: #2c3e50; color: white; }
        img { max-width: 600px; width: 100%; border: 5px solid #ecf0f1; border-radius: 10px; margin-top: 20px;}
        .painel { background-color: #34495e; padding: 20px; border-radius: 10px; display: inline-block; margin-top: 20px; }
        .resultado { font-size: 30px; font-weight: bold; color: #f1c40f; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="painel">
        <h1>Visão da ESP32-CAM</h1>
        <img src="/static/latest.jpg?t={{ tempo }}" alt="Aguardando a primeira foto...">
        <div class="resultado">
            Identificou: {{ classe }} ({{ confianca }}%)
        </div>
    </div>
</body>
</html>
"""

# Rota para acessar pelo navegador
@app.route("/")
def index():
    return render_template_string(PAGINA_HTML, classe=ultima_classe, confianca=round(ultima_confianca*100, 2), tempo=time.time())

# Rota que a ESP32 acessa para mandar a foto
@app.route("/predict", methods=["POST"])
def predict():
    global ultima_classe, ultima_confianca
    
    if 'image' not in request.files:
        return jsonify({"erro": "Nenhuma imagem enviada"}), 400
    
    file = request.files['image']
    
    # Lê a imagem
    image = Image.open(io.BytesIO(file.read())).convert("RGB")
    
    # SALVA A IMAGEM para a página web poder mostrar
    image.save("static/latest.jpg")
    
    # Prepara para a IA
    image_resized = image.resize((224, 224))
    image_array = np.asarray(image_resized)
    normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1
    data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
    data[0] = normalized_image_array
    
    # Faz a predição
    prediction = model.predict(data)
    index = np.argmax(prediction)
    
    ultima_classe = class_names[index].strip()[2:] 
    ultima_confianca = float(prediction[0][index])
    
    print(f"Detectado: {ultima_classe} com {ultima_confianca*100:.2f}% de certeza")
    
    return jsonify({
        "classe": ultima_classe,
        "confianca": ultima_confianca
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)