/**
 * Created with JetBrains WebStorm.
 * User: paulroosens
 * Date: 10/10/13
 * Time: 10:31
 * To change this template use File | Settings | File Templates.
 */


// We need to use the express framework: have a real web server that knows how to send mime types etc.
var express=require('express');

// Init globals variables for each module required
var app = express()
    , http = require('http')
    , server = http.createServer(app)
    , io = require('socket.io').listen(server);

// Indicate where static files are located
app.configure(function () {
    app.use(express.static(__dirname + '/'));
});

// launch the http server on given port
// server.listen(8080);
var ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1" ;
var port =   process.env.OPENSHIFT_NODEJS_PORT || 80 ;

  server.listen(port  , ipaddr) ;

// routing
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

// usernames which are currently connected to the chat
var usernames = {};
var premierJoueur = true ;
var rooms = new Array() ;
Array.prototype.unset = function(index){
    if(index > -1){
        this.splice(index,1)
    }
}

rooms.push(new Array()) ;


var allSockets = new Array() ;

io.sockets.on('connection', function (socket) {

    // when the client emits 'sendchat', this listens and executes
    socket.on('sendPlayersPosition', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters

        //  io.sockets.broadcast.emit('updatePlayersPosition', socket.username, data);
        io.sockets.in(socket.room).emit('updatePlayersPosition', socket.username, data);
    });

    socket.on('sendShoot', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters

        io.sockets.in(socket.room).emit('updateShoot', socket.username, data);
    });


    socket.on('sendchat', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters

        io.sockets.in(socket.room).emit('updatechat', socket.username, data);
    });


    var roomSelect = ""   ;
    socket.on('adduser', function(username){

        var allreadyTake = false ;

        for( var name in usernames)
        {
            if(name == username)
            {
                allreadyTake = true ;
                break ;
            }
        }
        if(allreadyTake)
        {
            socket.emit("NameNotAvailable" , username);
        }else
        {

            // var roomSelect = ""   ;
            var roomFind = false ;
            for(var nbRoom = 0 ; nbRoom< rooms.length ; nbRoom++)
            {
                if(rooms[nbRoom].length < 4 )
                {
                    roomSelect =   nbRoom ;

                    rooms[nbRoom].push(username) ;
                    roomFind = true ;
                    break ;
                    // ajouter
                }
            }
            if(!roomFind)
            {

                premierJoueur = true ;
                rooms.push(new Array()) ;

                roomSelect = (rooms.length -1) ;
                rooms[roomSelect].push(username) ;
            }

            if(rooms[nbRoom].length == 1)
            {
                socket.username = username;
                io.sockets.sockets[username] =  socket.id ;
                //  allSockets[username] = socket.id ;

                socket.room = roomSelect ;
                usernames[username] = username;
                //    premierJoueur = false ;
                socket.join(roomSelect) ;
                socket.emit("validation" , username ) ;

                socket.emit("start" , "") ;
            }else
            {
                console.log("NON SERIEUX ?? " + usernames.length) ;
                socket.username = username;
                socket.room = roomSelect ;
                io.sockets.sockets[username] =  socket.id ;
                usernames[username] = username;
                socket.join(roomSelect) ;
                socket.emit("validation" , username ) ;

                needAllPlayerPosition(username , rooms[roomSelect][0]) ;

            }






//                // echo to client they've connected
//                socket.emit('updatechat', 'SERVER', 'you have connected');
//                // echo globally (all clients) that a person has connected
//                socket.emit('updatechat', 'SERVER', username + ' has connected');
//                // update the list of users in chat, client-side
//                io.sockets.emit('updateusers', usernames);
        }

    });
    socket.on('needAllPlayersPosition' , function(username)
    {
        // envoyer que a un ancien
        needAllPlayerPosition(username , rooms[ socket.room][0]) ;
        /*
         A CHANGER amélioration <= envoyer au MASTER
         */
        //  io.sockets.emit('giveMeYourPlayers' , username) ;

    });
    socket.on('sendAllPlayer' , function(username , data)
    {
        for(var n in usernames)
        {
            if(n == username)
            {
                var sock_id = io.sockets.sockets[n] ;
                io.sockets.sockets[sock_id].emit('allPlayers'  , data) ;
                break ;
            }
        }


    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function(){

        if(rooms[roomSelect] != null)
        {
            for(var p = 0 ; p < rooms[roomSelect].length ; p++ )
            {
                if(rooms[socket.room][p] == socket.username)
                {
                    rooms[socket.room].unset(p);
                }
            }
        }

        // remove the username from global usernames list
        delete usernames[socket.username];
        // update list of users in chat, client-side
        io.sockets.in(socket.room).emit('outPlayer', socket.username);
        // echo globally that this client has left
        //  socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        socket.leave(socket.room);
    });
});

function needAllPlayerPosition(usernameNeed , userNameHave   )
{

    var sock_id = io.sockets.sockets[userNameHave] ;
    io.sockets.sockets[sock_id].emit("giveMeYourPlayers", usernameNeed);
}