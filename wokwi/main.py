import network
import time
import dht
import urequests
import ujson
from machine import Pin

# Configuracoes do dispositivo
DISPOSITIVO = "ESP32-01"
INTERVALO = 10
TEMP_MIN = 18
TEMP_MAX = 27
UMID_MIN = 40
UMID_MAX = 60

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
        alerta_temp = temperatura < TEMP_MIN or temperatura > TEMP_MAX
        alerta_umid = umidade < UMID_MIN or umidade > UMID_MAX

        print("-----------------------------")
        print("Temperatura:", temperatura, "C")
        print("Umidade:", umidade, "%")

        if temperatura < TEMP_MIN:
            print("Temperatura: ABAIXO DO LIMITE")
        elif temperatura > TEMP_MAX:
            print("Temperatura: ACIMA DO LIMITE")
        else:
            print("Temperatura: NORMAL")

        if umidade < UMID_MIN:
            print("Umidade: ABAIXO DO LIMITE")
        elif umidade > UMID_MAX:
            print("Umidade: ACIMA DO LIMITE")
        else:
            print("Umidade: NORMAL")

        if alerta_temp and alerta_umid:
            print("Status: CRITICO")
        elif alerta_temp or alerta_umid:
            print("Status: ATENCAO")
        else:
            print("Status: NORMAL")

        # Envio das medicoes para a API
        enviar_leitura(temperatura, umidade)

    except Exception as erro:
        print("Erro:", erro)

    time.sleep(INTERVALO)
