'use strict';

var pomelo = require('pomelo');
//var async = require('async');
var sessionService = pomelo.app.get('sessionService');

////////////////////////////////////////////////////////////////////////////////////

module.exports = function (app) {
    return new Cron(app);
};
var Cron = function (app) {
    this.app = app;
};

Cron.prototype.CheckLogin = function () {
    var nowDT = new Date();
    sessionService.forEachSession(function(session){
        if(session.uid==null)
        {
            var d = new Date(session.get('Connectime'));
            var seconds = parseInt((nowDT-d)/1000);
            /*if(d==null || isNaN(seconds)){ //修正!seconds
                Close(session);
            }*/
            console.log("Unlogin : "+seconds);
            //GPB.ShowLog(1,"Unlogin : "+seconds);
            if(seconds>30 || isNaN(seconds)){
                Close(session);
                console.log("Unlogin : x");
                //GPB.ShowLog(1,"Unlogin : x");
            }
        }
        else if(session.get('Stop')==1)
        {
            var d = new Date(session.get('Stoptime'));
            var seconds = parseInt((nowDT-d)/1000);
            console.log(session.uid+'STOP');
            console.log("Stop : "+seconds);
            if(seconds>5){
                Close(session);
                console.log("Stop : x");
            }
        }
    });
};
Cron.prototype.CheckIdle = function () { //閒置踢除(超過30分鐘)
    var nowDT = new Date();
    sessionService.forEachBindedSession(function(session){
        if(session.uid==null)
        {
            var d = new Date(session.get('Connectime'));
            var seconds = parseInt((nowDT-d)/1000);
            console.log("Unlogin : "+seconds);
            //GPB.ShowLog(1,"Unlogin : "+seconds);
            if(seconds>1800){
                Close(session);
                console.log("Unlogin : x");
            }
        }
        else if(session.get('Stop')==1)
        {
            var d = new Date(session.get('Stoptime'));
            var seconds = parseInt((nowDT-d)/1000);
            console.log(session.uid+'STOP');
            console.log("Stop : "+seconds);
            if(seconds>5){
                Close(session);
                console.log("Stop : x");
            }
        }
    });
};

    var StopClient = function(session){
        if(session.get('Stop')!=1){
            //GPB.EventEmitter.emit('onStop',socket,'');
            session.set('Stop', 1);
            session.set('Stoptime',new Date());
            session.pushAll();
            //session.SendMessage('0','','KICK',{'date': new Date()});
        }
    }
    var Close = function(session){
        //redis.quit();
        sessionService.kickBySessionId(session.id,function(res){
        //sessionService.sendMessage(session.id,'onKick');
        console.log('kick Success');
        });
    }
