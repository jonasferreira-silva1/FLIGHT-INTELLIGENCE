import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split

def generate_synthetic_data(n_samples=5000):
    np.random.seed(42)
    
    # 1. Gerar features aleatórias mas realistas
    hora_partida = np.random.randint(0, 24, n_samples)
    dia_semana = np.random.randint(0, 7, n_samples)
    mes = np.random.randint(1, 13, n_samples)
    companhia_code = np.random.randint(0, 5, n_samples)  # 5 companhias
    rota_code = np.random.randint(0, 15, n_samples)       # 15 rotas comuns
    distancia_km = np.random.uniform(300, 3000, n_samples)
    historico_atraso_14d = np.random.uniform(2, 45, n_samples)
    carga_aeroporto = np.random.randint(1, 15, n_samples)
    
    # 2. Definir regras lógicas para probabilidade de atraso (>15 minutos)
    # Fatores de risco:
    # - Horário de pico (fim de tarde/noite: 17h às 21h)
    pico = ((hora_partida >= 17) & (hora_partida <= 21)).astype(int)
    # - Carga alta do aeroporto (>8 voos/hora)
    carga_alta = (carga_aeroporto > 8).astype(int)
    # - Histórico de atraso alto da rota (>25 minutos)
    historico_alto = (historico_atraso_14d > 25).astype(int)
    
    # Probabilidade base de atraso é 10%, adicionando riscos
    base_prob = 0.10 + 0.25 * pico + 0.20 * carga_alta + 0.25 * historico_alto
    base_prob = np.clip(base_prob, 0.05, 0.95)
    
    # Amostrar o label binário (se atrasou mais de 15 minutos)
    delay_predicted = (np.random.rand(n_samples) < base_prob).astype(int)
    
    # Estimar o atraso contínuo em minutos
    delay_minutes = np.zeros(n_samples)
    for i in range(n_samples):
        if delay_predicted[i] == 1:
            # Atraso realístico: média 30min + acréscimo de congestionamento
            mean_delay = 20 + 0.4 * historico_atraso_14d[i] + 1.2 * carga_aeroporto[i]
            delay_minutes[i] = int(np.clip(np.random.normal(mean_delay, 10), 16, 180))
        else:
            # Pequenos atrasos operacionais comuns (0 a 15 minutos)
            delay_minutes[i] = int(np.clip(np.random.exponential(4), 0, 15))
            
    df = pd.DataFrame({
        'hora_partida': hora_partida,
        'dia_semana': dia_semana,
        'mes': mes,
        'companhia_code': companhia_code,
        'rota_code': rota_code,
        'distancia_km': distancia_km,
        'historico_atraso_14d': historico_atraso_14d,
        'carga_aeroporto': carga_aeroporto,
        'delay_predicted': delay_predicted,
        'delay_minutes': delay_minutes
    })
    
    return df

def train_models():
    print("Gerando dados sintéticos para treinamento...")
    df = generate_synthetic_data(5000)
    
    X = df[[
        'hora_partida', 'dia_semana', 'mes', 'companhia_code', 
        'rota_code', 'distancia_km', 'historico_atraso_14d', 'carga_aeroporto'
    ]]
    y_class = df['delay_predicted']
    y_reg = df['delay_minutes']
    
    # Separar em treino e teste
    X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42
    )
    
    print("Treinando Classificador de Atrasos (Random Forest)...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    clf.fit(X_train, y_class_train)
    acc = clf.score(X_test, y_class_test)
    print(f"Acurácia do classificador nos dados de teste: {acc:.2%}")
    
    print("Treinando Regressor de Tempo de Atraso (Random Forest)...")
    reg = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    reg.fit(X_train, y_reg_train)
    r2 = reg.score(X_test, y_reg_test)
    print(f"R² do regressor nos dados de teste: {r2:.2f}")
    
    # Criar pasta para salvar modelos se não existir
    model_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(model_dir, exist_ok=True)
    
    # Salvar modelos
    joblib.dump(clf, os.path.join(model_dir, 'classifier.joblib'))
    joblib.dump(reg, os.path.join(model_dir, 'regressor.joblib'))
    print(f"Modelos salvos com sucesso em '{model_dir}'!")

if __name__ == '__main__':
    train_models()
