import os
import datetime
import hashlib
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Inicializar FastAPI
app = FastAPI(
    title="REC Flight Intelligence - ML Service",
    description="Microserviço em FastAPI para predição de atraso de voos no Recife.",
    version="1.3.0"
)

# Caminhos dos modelos
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLASSIFIER_PATH = os.path.join(BASE_DIR, 'model', 'classifier.joblib')
REGRESSOR_PATH = os.path.join(BASE_DIR, 'model', 'regressor.joblib')

# Variáveis globais para os modelos
classifier = None
regressor = None

@app.on_event("startup")
def load_models():
    global classifier, regressor
    if not os.path.exists(CLASSIFIER_PATH) or not os.path.exists(REGRESSOR_PATH):
        raise RuntimeError(
            f"Modelos não encontrados. Execute o script de treino primeiro. "
            f"Procurando em: {CLASSIFIER_PATH} e {REGRESSOR_PATH}"
        )
    classifier = joblib.load(CLASSIFIER_PATH)
    regressor = joblib.load(REGRESSOR_PATH)
    print("Modelos de Machine Learning carregados com sucesso!")

class PredictRequest(BaseModel):
    callsign: str = Field(..., example="GLO1234")
    scheduled_dep: str = Field(..., example="2026-06-14T08:00:00Z")
    origin: str = Field(..., example="GRU")
    destination: str = Field(..., example="REC")
    airline: str = Field(..., example="G3")

class PredictResponse(BaseModel):
    delay_predicted: bool
    delay_minutes_estimate: int
    confidence: float
    model_version: str

# Dicionários estáticos auxiliares para mapeamentos
AIRLINE_MAP = {
    "G3": 0, "GLO": 0,
    "AD": 1, "AZU": 1,
    "LA": 2, "TAM": 2, "LAN": 2, "JJ": 2,
    "2Z": 3, "PTB": 3
}

ROUTE_MAP = {
    "GRU-REC": 0, "REC-GRU": 0,
    "CGH-REC": 1, "REC-CGH": 1,
    "GIG-REC": 2, "REC-GIG": 2,
    "BSB-REC": 3, "REC-BSB": 3,
    "SSA-REC": 4, "REC-SSA": 4,
    "FOR-REC": 5, "REC-FOR": 5,
    "NAT-REC": 6, "REC-NAT": 6,
    "MCZ-REC": 7, "REC-MCZ": 7
}

DISTANCE_MAP = {
    "GRU-REC": 2100.0, "REC-GRU": 2100.0,
    "CGH-REC": 2120.0, "REC-CGH": 2120.0,
    "GIG-REC": 1860.0, "REC-GIG": 1860.0,
    "BSB-REC": 1650.0, "REC-BSB": 1650.0,
    "SSA-REC": 650.0,  "REC-SSA": 650.0,
    "FOR-REC": 620.0,  "REC-FOR": 620.0,
    "NAT-REC": 200.0,  "REC-NAT": 200.0,
    "MCZ-REC": 200.0,  "REC-MCZ": 200.0
}

def get_callsign_hash_value(callsign: str, modulo: int) -> int:
    """Gera um valor numérico determinístico baseado no hash do callsign."""
    h = hashlib.md5(callsign.encode('utf-8')).hexdigest()
    return int(h, 16) % modulo

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "REC Flight Intelligence ML Provider",
        "version": "v1.3.0"
    }

@app.get("/health")
def health_check():
    if classifier is not None and regressor is not None:
        return {"status": "healthy", "models_loaded": True}
    return {"status": "unhealthy", "models_loaded": False}

@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    if classifier is None or regressor is None:
        raise HTTPException(status_code=503, detail="Os modelos de ML não foram carregados.")
    
    try:
        # 1. Parse da data/hora programada
        # Suporta formatos com 'Z' ou offset de fuso horário
        date_str = payload.scheduled_dep.replace('Z', '+00:00')
        dt = datetime.datetime.fromisoformat(date_str)
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato de data inválido em scheduled_dep. Use ISO 8601 (ex: YYYY-MM-DDTHH:MM:SSZ). Erro: {str(e)}"
        )
    
    # 2. Derivação de features temporais
    hora_partida = dt.hour
    dia_semana = dt.weekday()  # 0=Segunda, 6=Domingo
    mes = dt.month
    
    # 3. Label encoding determinístico para Companhia
    companhia_code = AIRLINE_MAP.get(payload.airline.upper(), 4) # Default 4
    
    # 4. Label encoding determinístico para Rota
    route_key = f"{payload.origin.upper()}-{payload.destination.upper()}"
    rota_code = ROUTE_MAP.get(route_key, 14)  # Default 14 para outras rotas
    
    # 5. Distância geográfica em km
    distancia_km = DISTANCE_MAP.get(route_key, 1000.0) # Default 1000km
    
    # 6. Histórico de atraso nos últimos 14 dias (Simulado de forma determinística via hash do callsign)
    # Varia entre 2 e 47 minutos dependendo do voo, garantindo consistência
    historico_atraso_14d = 2.0 + float(get_callsign_hash_value(payload.callsign, 45))
    
    # 7. Carga operacional do aeroporto de origem no horário
    # Pico (fim de tarde) gera maior carga
    base_load = 8 if (hora_partida >= 17 and hora_partida <= 21) else 3
    # Variação sutil baseada no callsign
    carga_aeroporto = base_load + (get_callsign_hash_value(payload.callsign, 5))
    
    # Montar DataFrame
    features = pd.DataFrame([{
        'hora_partida': hora_partida,
        'dia_semana': dia_semana,
        'mes': mes,
        'companhia_code': companhia_code,
        'rota_code': rota_code,
        'distancia_km': distancia_km,
        'historico_atraso_14d': historico_atraso_14d,
        'carga_aeroporto': carga_aeroporto
    }])
    
    # Executar classificação
    class_pred = classifier.predict(features)[0]
    class_probs = classifier.predict_proba(features)[0]
    confidence = float(class_probs[class_pred])
    
    # Executar regressão
    reg_pred = regressor.predict(features)[0]
    delay_minutes_estimate = int(round(reg_pred))
    
    # Alinhamento lógico de classificação e regressão
    # Se classificou como atraso (1), a estimativa deve ser >= 16 minutos.
    # Se classificou como no horário (0), a estimativa deve ser < 16 minutos.
    if class_pred == 1 and delay_minutes_estimate < 16:
        delay_minutes_estimate = 16
    elif class_pred == 0 and delay_minutes_estimate >= 16:
        delay_minutes_estimate = 15
        
    return PredictResponse(
        delay_predicted=bool(class_pred == 1),
        delay_minutes_estimate=delay_minutes_estimate,
        confidence=round(confidence, 2),
        model_version="v1.3.0"
    )
