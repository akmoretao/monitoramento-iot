import network
import time
import dht
import urequests
import ujson
from machine import Pin

# Configuracoes do dispositivo
DISPOSITIVO = "ESP32-01"
INTERVALO = 10
LIMITE_TEMPERATURA = 30

# Endereco da API REST
API_URL = "https://wbtuhibegvmlhofnxxyv.supabase.co/functions/v1/leituras"

# Configuracao do sensor
sensor = dht.DHT22(Pin(15))

# Configuracao da rede Wi-Fi
wifi = network.WLAN(network.STA_IF)
wifi.active(True)

# A chave sera informada durante a execucao
API_KEY = input("Informe a chave da API: ").strip()


def conectar_wifi():
    if not wifi.isconnected():
        print("Conectando ao Wi-Fi...")
        wifi.connect("Wokwi-GUEST", "")

        while not wifi.isconnected():
            time.sleep(1)

        print("Wi-Fi conectado!")


def enviar_leitura(temperatura, umidade):
    dados = {
        "dispositivo": DISPOSITIVO,
        "temperatura": temperatura,
        "umidade": umidade
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }

    resposta = urequests.post(
        API_URL,
        data=ujson.dumps(dados),
        headers=headers
    )

    try:
        if resposta.status_code == 201:
            print("Leitura enviada com sucesso!")
        else:
            print("Erro HTTP:", resposta.status_code)
            print(resposta.text)
    finally:
        resposta.close()


print("Sistema de monitoramento IoT iniciado")

while True:
    try:
        conectar_wifi()

        # Coleta das medicoes
        sensor.measure()

        temperatura = sensor.temperature()
        umidade = sensor.humidity()

        # Processamento local
        alerta = temperatura >= LIMITE_TEMPERATURA

        print("-----------------------------")
        print("Temperatura:", temperatura, "C")
        print("Umidade:", umidade, "%")

        if alerta:
            print("Status: ALERTA")
        else:
            print("Status: NORMAL")

        # Envio das medicoes para a API
        enviar_leitura(temperatura, umidade)

    except Exception as erro:
        print("Erro:", erro)

    time.sleep(INTERVALO)
