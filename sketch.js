var Camara;
var BotonesEntrenar;
var knn;
var modelo;
var Texto;
var Clasificando = false;
var InputTexbox;
var BotonTexBox;


// MQTT client details:
let broker = {
    hostname: 'neuralink-bot1.cloud.shiftr.io',
    port: 443
};
// MQTT client:
let client;
// client credentials:
let creds = {
    clientID: 'Pagina_Cliente_CAMARA',
    userName: 'neuralink-bot1',
    password: 'neuralink-bot1'
}
// topic to subscribe to when you connect:
let topic = 'notes';

// a pushbutton to send messages
let sendButton;
let localDiv;
let remoteDiv;

// intensity of the circle in the middle
let intensity = 255;


function setup() {
    createCanvas(320, 240);
    background(255, 0, 0);
    Camara = createCapture(VIDEO);
    Camara.size(320, 240);
    Camara.hide();

    modelo = ml5.featureExtractor("MobileNet", ModeloListo);
    knn = ml5.KNNClassifier();
    createP("Presiona Botones para entrenar");

    var BotonArduino = createButton("Encender");
    BotonArduino.class("BotonEntrenar");

    var BotonRedboard = createButton("Redboard");
  BotonRedboard.class("BotonEntrenar");

  var BotonESP8266 = createButton("ESP8266");
  BotonESP8266.class("BotonEntrenar");

  var BotonESP32 = createButton("ESP32");
  BotonESP32.class("BotonEntrenar");

  var BotonNada = createButton("Apagar");
  BotonNada.class("BotonEntrenar");

  createP("Entrena usando TexBox");

    InputTexbox = createInput("Cosa 2");

    BotonTexBox = createButton("Entrenar con " + InputTexbox.value());
    BotonTexBox.mousePressed(EntrenarTexBox);

    createP("Guarda o Carga tu Neurona");

    var BotonGuardar = createButton("Guardar");
    BotonGuardar.mousePressed(GuardadNeurona);
    var BotonCargar = createButton("Cargar");
    BotonCargar.mousePressed(CargarNeurona);

    Texto = createP("Modelo no Listo, esperando");

    BotonesEntrenar = selectAll(".BotonEntrenar");

    for (var B = 0; B < BotonesEntrenar.length; B++) {
      BotonesEntrenar[B].style("margin", "5px");
      BotonesEntrenar[B].style("padding", "6px");
      BotonesEntrenar[B].mousePressed(PresionandoBoton);
    }


    // Create an MQTT client:
    client = new Paho.MQTT.Client(broker.hostname, Number(broker.port), creds.clientID);
    // set callback handlers for the client:
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    // connect to the MQTT broker:
    client.connect(
        {
            onSuccess: onConnect,       // callback function for when you connect
            userName: creds.userName,   // username
            password: creds.password,   // password
            useSSL: true                // use SSL
        }
    );
    // create the send button:
    // create a div for local messages:
    localDiv = createDiv('local messages will go here');
    //localDiv.position(20, 50);
    //localDiv.style('color', '#fff');
    // create a div for the response:
    remoteDiv = createDiv('waiting for messages');
    //remoteDiv.position(20, 80);
    //remoteDiv.style('color', '#fff');
}

function draw() {
    //background(50);
    // draw a circle whose brightness changes when a message is received:
    //fill(intensity);
    //circle(width/2, height/2, width/2);
// subtract one from the brightness of the circle:
    //if (intensity > 0) {
      //  intensity--;
    //}


    image(Camara, 0, 0, 320, 240);
    BotonTexBox.html("Entrenar con " + InputTexbox.value());
    if (knn.getNumLabels() > 0 && !Clasificando) {
    //clasificar();
    setInterval(clasificar, 500);
    Clasificando = true;
  }
}

// called when the client connects
function onConnect() {
    console.log("MQTT Conectado");
    localDiv.html('client is connected');
    client.subscribe(topic);
}

// called when the client loses its connection
function onConnectionLost(response) {
    if (response.errorCode !== 0) {
        localDiv.html('onConnectionLost:' + response.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    remoteDiv.html('I got a message:' + message.payloadString);
    let  incomingNumber = parseInt(message.payloadString);
    if (incomingNumber > 0) {
        intensity = 255;
    }
}

// called when you want to send a message:
function sendMqttMessage() {
    // if the client is connected to the MQTT broker:
    if (client.isConnected()) {
        // make a string with a random number form 0 to 15:
        let msg = String(round(random(15)));
        // start an MQTT message:
        message = new Paho.MQTT.Message(msg);
        // choose the destination topic:
        message.destinationName = topic;
        // send it:
        client.send(message);
        // print what you sent:
        localDiv.html('I sent: ' + message.payloadString);
    }
}

function ModeloListo() {
  console.log("Modelo Listo");
  localDiv.html("Modelo Listo");
}

function EntrenarTexBox() {
  const Imagen = modelo.infer(Camara);
  knn.addExample(Imagen, InputTexbox.value());
}

function GuardadNeurona() {
  if (Clasificando) {
    save(knn, "modelo.json");
  }
}

function CargarNeurona() {
  console.log("Cargando una Neurona");
  knn.load("./modelo.json", function() {
    console.log("Neurona Cargada knn");
    Texto.html("Neurona cargana de archivo");
  });
}

function PresionandoBoton() {
  var NombreBoton = this.elt.innerHTML;
  console.log("Entrenando con " + NombreBoton);
  EntrenarKnn(NombreBoton);
}

function EntrenarKnn(ObjetoEntrenar) {
  const Imagen = modelo.infer(Camara);
  knn.addExample(Imagen, ObjetoEntrenar);
}


// Temporary save code until ml5 version 0.2.2
const save = (knn, name) => {
  const dataset = knn.knnClassifier.getClassifierDataset();
  if (knn.mapStringToIndex.length > 0) {
    Object.keys(dataset).forEach(key => {
      if (knn.mapStringToIndex[key]) {
        dataset[key].label = knn.mapStringToIndex[key];
      }
    });
  }
  const tensors = Object.keys(dataset).map(key => {
    const t = dataset[key];
    if (t) {
      return t.dataSync();
    }
    return null;
  });
  let fileName = "myKNN.json";
  if (name) {
    fileName = name.endsWith(".json") ? name : `${name}.json`;
  }
  saveFile(fileName, JSON.stringify({dataset, tensors}));
};



const saveFile = (name, data) => {
  const downloadElt = document.createElement("a");
  const blob = new Blob([data], {
    type: "octet/stream"
  });
  const url = URL.createObjectURL(blob);
  downloadElt.setAttribute("href", url);
  downloadElt.setAttribute("download", name);
  downloadElt.style.display = "none";
  document.body.appendChild(downloadElt);
  downloadElt.click();
  document.body.removeChild(downloadElt);
  URL.revokeObjectURL(url);
};


function clasificar() {
  const Imagen = modelo.infer(Camara);
  knn.classify(Imagen, function(error, result) {
    if (error) {
      console.error();
    } else {
      Texto.html("Es un " + result.label);
      message = new Paho.MQTT.Message(result.label);
      message.destinationName = "Neurona/Clasificador";
      client.send(message);
      //clasificar();
    }
  });
}

