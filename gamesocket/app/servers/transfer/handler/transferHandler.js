var pomelo=require('pomelo');
var logger = require('pomelo-logger').getLogger(__filename);

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
};
//===固定==============================================================
var handler = Handler.prototype;
var GPB = new(require(pomelo.app.getBase()+'/app/consts/Base_Param.js'))();
var redis=pomelo.app.get('redis');
var async=require('async');
var PUB = new(require(pomelo.app.getBase()+'/app/lib/public_fun.js'))();
//===固定==============================================================


handler.Transfer = function(msg,session,next){
	console.log('轉帳handle');
	var async = require('async');
	var logId=0;
	var lib_games = new (require(pomelo.app.getBase()+'/app/lib/lib_games.js'))(); //扣款寫入member_amount_log,回傳amount_log Index ID
	async.series({
		A: function(callback_A){
			var struct_amount = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))(); //amount_log SQL
			/*struct_amount.params.transfer_type = 51;
			struct_amount.params.transfer_no = '';
			struct_amount.params.from_gkey = 'MAIN';
			struct_amount.params.to_gkey = 'CTL';
			struct_amount.params.operator = session.uid;
			struct_amount.params.uip = session.get('memberdata').ip;
			struct_amount.params.otype = 'm';
			struct_amount.params.gameid = '0';
			struct_amount.params.bydate = formatDate();*/
			struct_amount.params.type = 51;
			struct_amount.params.game_id = 0;
			struct_amount.params.game_name = 0;
		    //mid,金額,amountlogSQL
			lib_games.DeductMoney(session.uid,msg.amount,struct_amount,function(result)
			{
			  switch(result)
			  {
			    case -1:
			      console.log('查無此id');
			      callback_A(-1,result);
			      break;
			    case -2:
			      console.log('餘額不足');
			      callback_A(-2,result);
			      break;
			    case -3:
			      console.log('扣款失敗');
			      callback_A(-3,result);
			      break;
			    case -4:
			      console.log('寫log失敗');
			      callback_A(-4,result);
			      break;
			    default:
			       //result是扣款成功後寫入amount的id
			      logId=result;
			      callback_A(0,result);
			      break;
			  }
			});
		},
		B: function(callback_B){
			//GET/POST 到API
			var http = require('http'); 
			var qs = require('querystring'); 
			   
			var data = { 
			    ON: logId, 
			    ID: session.uid,
			    AM: msg.amount};//這是需要提交到ToCBIN的Data 
			var content = qs.stringify(data); 
			var options = { 
			    hostname: "lobby.fa88999.com", 
			    port: 8088, 
			    path: "/ToCBIN.php?" + content, 
			    method: 'GET' 
			}; 
			var req = http.request(options, function (res) { 
				//console.log(res);
			    //console.log('STATUS: ' + res.statusCode); 
			    //console.log('HEADERS: ' + JSON.stringify(res.headers)); 
			    res.setEncoding('utf8'); 
			    res.on('data', function (chunk) {
			        console.log('BODY: ' + chunk);
			        var data = JSON.parse(chunk)
			        if(data.ErrorCode==0){
			            callback_B(null,0);
			        }else{
			    		callback_B(1,data.ErrorMessage);
			        }
			    });
			});
			req.on('error', function (e) { 
			    console.log('problem with request: ' + e.message); 
			}); 
			req.end();
		},
		C: function(callback_C){
			var struct_mem100 = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))();
			    //var lib_amount = new (require(app.getBase()+'/app/lib/lib_SQL.js'))("member2",struct_sql);
			    var lib_mem100 = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("users",struct_mem100);
			    struct_mem100.select.mem100 = "1";
			    struct_mem100.where.mid = session.uid;
			    lib_mem100.Select(function(data){
			    	callback_C(null,data[0].mem100);
			});
		}
	},
	function(err, results)
	{
		if(err)
		{
			next(null,{'ErrorCode':1,'ErrorMessage':'发生错误:000'});
			Close(session);
		}else{
			redis.hset(GPB.rKey_USER+session.uid, "TRANS_TIME", PUB.formatDate()+" "+PUB.formatDateTime());//若Redis掛了就Select users updated_at 欄位?
			next(null,{'ErrorCode':0,'ErrorMessage':'转出成功已扣除电子游戏帐户！','Newbalance':results.C});
			Close(session);
		}
		
	});
		
}

var Close = function(session){
    var backendSessionService = pomelo.app.get('backendSessionService');
    var connectors = pomelo.app.getServersByType('connector');
    backendSessionService.kickByUid(connectors[0].id,session.uid,function(res){
   		console.log(session.uid+'已從轉帳入口踢出!');
    });
}