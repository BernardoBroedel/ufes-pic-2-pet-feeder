from flask import Flask, request, jsonify
from tf_keras.models import load_model # Usando tf_keras que corrigiu nosso problema de versão
import numpy as np
from PIL import Image
import io

# Cria o aplicativo servidor
app = Flask(__name__)

# Carrega o modelo e as classes na memória
print("Carregando modelo de Inteligência Artificial...")
model = load_model("keras_model.h5", compile=False)

with open("labels.txt", "r") as f:
    class_names = f.readlines()
print("Modelo carregado com sucesso! Aguardando imagens...")

# Cria a rota que vai receber a foto
@app.route("/predict", methods=["POST"])
def predict():
    # Verifica se enviaram um arquivo chamado 'image'
    if 'image' not in request.files:
        return jsonify({"erro": "Nenhuma imagem enviada"}), 400
    
    file = request.files['image']
    
    # Lê e processa a imagem
    image = Image.open(io.BytesIO(file.read())).convert("RGB")
    image = image.resize((224, 224))
    
    # Prepara a matriz matemática para a IA
    image_array = np.asarray(image)
    normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1
    data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
    data[0] = normalized_image_array
    
    # Faz a predição!
    prediction = model.predict(data)
    index = np.argmax(prediction)
    
    # Limpa o texto da label (ex: "0 Gato_A" vira "Gato_A")
    class_name = class_names[index].strip()[2:] 
    confidence_score = float(prediction[0][index])
    
    # Mostra no terminal do seu PC o que a IA achou
    print(f"Detectado: {class_name} com {confidence_score*100:.2f}% de certeza")
    
    # Devolve a resposta (JSON) para quem enviou a requisição
    return jsonify({
        "classe": class_name,
        "confianca": confidence_score
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)