//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var boryParser = require('body-parser');
var request = require('request');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(boryParser.json());
router.use(boryParser.urlencoded({ extended: false}));

var messages = [];
var sockets = [];




router.get('/webhook', function(req, res){
  
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'minhasenha123') {
    console.log('Validação ok!');
    res.status(200).send(req.query['hub.challenge']);
    
  } else {
    console.log('validação falhou!');
    res.sendStatus(403);
    
  } 
  
});

router.post('/webhook', function (req, res) {
  
  var data = req.body;
  
  if (data && data.object === 'page') {
    
    //percorer todas as entradas:
    data.entry.forEach(function (entry) {
          var pageID = entry.id;
          var timeOfEvent = entry.time;
        
          
          //Percorer todas as mensagens:
          entry.messaging.forEach(function (event) {
            if (event.message) {
              trataMensagem(event);
            }
          })
          
       })
       
       res.sendStatus(200);
  }
  
});

function trataMensagem (event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  console.log("Mensagem recebida do usuário %d pela pagina %d", senderID, recipientID);
  
  var messageID = message.mid;
  var messageText = message.text;
  var attachments = message.attachments;
  
  console.log(messageID);
  console.log(messageText);
  
  if  (messageText){
    switch (messageText) {
      case 'oi':
        sendTextMessage(senderID, 'Oi! Tudo bem com vc?');
        break;
      case 'tchau':
        sendTextMessage(senderID, 'tchau! Até mais.');
        break;
      default:
        sendTextMessage(senderID, 'Não entendi.');
        // code
    }
  } else if (attachments) {
     console.log('Me enviaram anexos!')
  }
  
}

function sendTextMessage  (recipientId, messageText){

  var messageData = {
    
    recipient: {
      id: recipientId
    }, 
    
    message: {
      text: messageText
    }
  };
  
  console.log(messageData.recipient.id);
  console.log(messageData.message.text);
  
  callSendAPI(messageData);
  
}


function callSendAPI (messageData) {
  request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: 'EAAJIFb8xooEBAHuDdLhDXpEUo4y3o7FO29BZCZC5eA8QF6fzuZB2Mcj5PC5SaOZBXbtwAArdGA9ZA0IU95V3wskFDcEIlWmSlZAJDzgrC8StEnY1xvpnbUDzQZC1YM2gFoImbpuVmNVIe4joib1SA7AZCkHkKMUi8ZCprklY6w0VJjvRz0HbVK5U0' },
      method: 'POST',
      json: messageData
  }, function (error, response, body) {
    
    if (!error && response.statusCode == 200) {
        console.log('Mensagem Enviada com sucesso!');
        var recipientID = body.recipient_id;
        var messageID = body.message_id;
    } else {
        console.log('Não foi possivel enviar mensagens!');
        console.log(response.statusCode);
        console.log(response.error);
    }
  })
}








io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return; 

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
