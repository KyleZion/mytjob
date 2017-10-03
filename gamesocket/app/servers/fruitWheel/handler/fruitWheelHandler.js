var pomelo=require('pomelo');
var logger = require('pomelo-logger').getLogger(__filename);

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};
//===固定==============================================================
var handler = Handler.prototype;
var redis=pomelo.app.get('redis');
var dbmaster=pomelo.app.get('dbmaster');
var dbslave=pomelo.app.get('dbslave');
var async=require('async');
var md5 = require('md5');
var backendSessionService = pomelo.app.get('backendSessionService');
var sessionService = pomelo.app.get('sessionService');
var gid='051';
var channel = pomelo.app.get('channelService').getChannel('connect',false);
var gameDao = require('../../../dao/gameDao');
var lib_games = new (require(pomelo.app.getBase()+'/app/lib/lib_games.js'))(); //扣款寫入member_amount_log,回傳amount_log Index ID
//===固定==============================================================

handler.bet = function(msg,session,next){
	var tmp = JSON.parse(msg.bet); //將C2傳來的下注內容string轉JSON
	var betData = null; //下注內容
	betData=tmp.data; //取JSON data
	var gameID=betData.GamesID;
	var amount = 0;//下注總金額
	var sessionMoney= 0 ;//原始帳戶餘額
	var betValue =[0,0,0,0,0,0,0]; //各注數 
	var betSqls=[];//寫入bet_g51的SQL Value
	var betkey=''; 
	var bet2='';
	var trans_no='';
	var logId = 0;
	var struct_bet = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))(); //bet_g SQL
	//計算下注總金額以及下注內容轉資料庫格式key0~6為下注號碼
	async.series({
	Z: function(callback_Z){
		for(var i=0;i<=6;i++){
			if(betData[i]!=0){
				amount= amount+betData[i]; //計算下注總金額
				betValue[i]=betData[i];
			}
		}
		callback_Z(null,0)
	},
	//=============================================================
	A:function(callback_A){
		var struct_amount = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))(); //amount_log SQL
		struct_amount.params.transfer_type = 20;
		struct_amount.params.from_gkey = 'MAIN';
		struct_amount.params.to_gkey = 'CTL';
		struct_amount.params.operator = session.uid;
		struct_amount.params.uip = session.get('memberdata').ip;
		struct_amount.params.otype = 'm';
		struct_amount.params.gameid = '51';
		struct_amount.params.bydate = formatDate();
	    //mid,金額,amountlogSQL
		lib_games.DeductMoney(session.uid,amount,struct_amount,function(result)
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
		       //result  是扣款成功後 寫入amount 的id
		      logId=result;
		      callback_A(0,result);
		      break;
		  }
		});
	},
	B: function(callback_B){
		betValue=betValue.join(',');
		betkey=gid+getSn(13);
		var checkSn=true; 
		//檢查唯一單號
		async.whilst(
			function() //test function: while test is true
			{ return checkSn; },
			function(callback) {
				dbslave.query('SELECT bet001 from bet_g51 where bet002 = ?',[betkey+'0001'],function(data){
					if(data.ErrorCode== 0)
					{ //如果有資料則return true 無則return false
						if(data.rows.length== 0)
						{
							console.log('單號未重複');
							checkSn=false;
							bet2=betkey+'0001';
							trans_no=bet2;
							struct_bet.params.betkey = betkey;
							struct_bet.params.betstate = 0;
							struct_bet.params.betwin = 0;
							struct_bet.params.betgts = formatDate()+" "+formatDateTime();
							struct_bet.params.bet000 = formatDate()+" "+formatDateTime();
							struct_bet.params.bet002 = bet2;
							struct_bet.params.bet003 = 0;
							struct_bet.params.bet005 = session.uid;
							struct_bet.params.bet009 = gameID;
							struct_bet.params.bet011 = 1151;
							struct_bet.params.bet012 = 0;
							struct_bet.params.bet013 = 1;
							struct_bet.params.bet014 = betValue;
							struct_bet.params.bet015 = 1;
							struct_bet.params.bet016 = 1;
							struct_bet.params.bet017 = amount;
							struct_bet.params.bet018 = 170000;
							struct_bet.params.bet034 =md5(Date.now());
							struct_bet.params.bydate =formatDate();
							callback(null,checkSn);
						}else{
							betkey=gid+getSn(13);
						}					
					}
				});
			},
			function (err, checkSn){
				if(!checkSn)
				{
					callback_B(null,0);
				}
			}
		);
	},
	C: function(callback_C){
		var lib_bet = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("bet_g51",struct_bet);
		lib_bet.Insert(function(res)
		{
			if(!!res)
			{
				console.log(res);
				console.log('insert betg51 success');
				callback_C(0,0);
			}else{
				console.log('Insert betg51 fail');
				logger.error('Insert betg51 Error');
				async.parallel([
					function(cb){
						gameDao.delAmountlogById(logId,cb);
					},
					function(cb){
						gameDao.addMoney(amount,session.uid,cb);
					}
				],
				function(err,results){
					if(err){
						logger.error('gameDao Error');
						callback_C(1,data.ErrorMessage);
						//next(null,{'ErrorCode':1,'ErrorMessage':'網路連線異常'});
					}else{
						callback_C(1,data.ErrorMessage);
						//next(null,{'ErrorCode':1,'ErrorMessage':'網路連線異常'});
					}
				});
			}

		});
	},
	D: function(callback_D){
		var struct_amount = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))(); //amount_log SQL
		struct_amount.params.transfer_no = trans_no;
		struct_amount.where.id=logId;
		var lib_amount = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("member_amount_log",struct_amount);
		lib_amount.Update(function(res)
		{
		    if(res===0)
		    {
			    console.log('UPDATE transfer_no success');
				callback_D(null,res);	
		    }else{
				async.parallel([
					function(cb){
						gameDao.delBet(session.uid,gameID,cb);
					},
					function(cb){
						gameDao.delAmountlogById(logId,cb);
					},
					function(cb){
						gameDao.addMoney(amount,session.uid,cb);
					}
				],
				function(err,results){
					if(err){
						logger.error('gameDao Error');
						callback_D(1,'網路連線異常');
						//next(null,{'ErrorCode':1,'ErrorMessage':'網路連線異常'});
					}else{
						callback_D(1,'網路連線異常');
						//next(null,{'ErrorCode':1,'ErrorMessage':'網路連線異常'});
					}
				});
		    }
		    
		});
	}
	},
	function(err, results) { //series執行結果
		if(err)//錯誤則刪單並退錢
		{
			next(null,{'ErrorCode':1,'ErrorMessage':'網路連線異常'});
		}else{
			console.log("下注完成");
			//UnlockAmount
			async.waterfall([
				function(cb)
				{
					gameDao.getMoney(session.uid, cb);
				}
				], 
				function(err,resDao)
				{
					if(err) {
						next(new Error('SQL error'),500);
					}else{
						next(null,{'ErrorCode':0,'ErrorMessage':'','bet': resDao});
					}
				}
			);
		}
	});
	
}


handler.GetGameID =function(msg,session,next){
	redis.hget('GS:GAMESERVER:fruitWheel', "GameID", function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{
			if(res==null){
				async.waterfall([
					function(cb) {
						gameDao.getGameId(51, cb);
					}
				], 
					function(err,resDao) {
						if(err) {
							next(new Error('SQL error'),500);
						}else{
							next(null,{'ErrorCode':0,'ErrorMessage':'','ID':resDao});
						}
					}
				);
			}else{ //success
				next(null,{'ErrorCode':0,'ErrorMessage':'','ID':res});
			}
		}
	});
}

handler.GetMoney =function(msg,session,next){
	async.waterfall([
		function(cb) {
			gameDao.getMoney(session.uid, cb);
		}
	], 
		function(err,resDao) {
			if(err) {
				next(new Error('SQL error'),500);
			}else{
				next(null,{'ErrorCode':0,'ErrorMessage':'','Money':resDao});
			}
		}
	);
}

handler.GetTimeZone = function(msg,session,next){
	var nowtime = formatDate()+" "+formatDateTime();
	redis.hget('GS:GAMESERVER:fruitWheel', "endTime", function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{
			if(res==null){
				async.waterfall([
					function(cb) {
						gameDao.getTimezone(nowtime,cb);
					}
				], 
					function(err,resDao) {
						if(err) {
							next(new Error('SQL error'),500);
						}else{
							next(null,{'ErrorCode':0,'ErrorMessage':'','TimeZone':resDao});
						}
					}
				);
			}else{
				var endtime = res;
				var timezone = (Date.parse(endtime)-Date.parse(nowtime))/1000;
				next(null,{'ErrorCode':0,'ErrorMessage':'','TimeZone':timezone});
			}
		}
	});
}

handler.GetHistory = function(msg,session,next){ //Redis
	switch(msg.count){
		case "10":
			redis.hget('GS:GAMESERVER:fruitWheel', "gameHistory", function (err, res) {
				if(err){
					next(new Error('redis error'),500);
				}else{
					if(res==null){
						async.waterfall([
							function(cb) {
								gameDao.getHistory(msg,cb);
							}
						], 
							function(err,resDao) {
								if(err) {
									next(new Error('SQL error'),500);
								}else{
									next(null,{'ErrorCode':0,'ErrorMessage':'','History':resDao});
								}
							}
						);
					}else{ //success
						next(null,{'ErrorCode':0,'ErrorMessage':'','History':res});
					}
				}
			});
			break;
		case "30":
			redis.hget('GS:GAMESERVER:fruitWheel', "lobbyHistory", function (err, res) {
				if(err){
					next(new Error('redis error'),500);
				}else{
					if(res==null){
						async.waterfall([
							function(cb) {
								gameDao.getHistory(msg,cb);
							}
						], 
							function(err,resDao) {
								if(err) {
									next(new Error('SQL error'),500);
								}else{
									next(null,{'ErrorCode':0,'ErrorMessage':'','History':resDao});
								}
							}
						);
					}else{ //success
						next(null,{'ErrorCode':0,'ErrorMessage':'','History':res});
					}
				}
			});
			break;
		default:
			next(null,{'ErrorCode':0,'ErrorMessage':'','History':'undefined'});
	}
}

handler.GetStatus = function(msg,session,next){  //Redis
	redis.hget('GS:GAMESERVER:fruitWheel', "Status", function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{
			if(res==null){
				async.waterfall([
					function(cb) {
						gameDao.getStatus(cb);
					}
				], 
					function(err,resDao) {
						if(err) {
							next(new Error('SQL error'),500);
						}else{
							next(null,{'ErrorCode':0,'ErrorMessage':'','GetStatus':resDao});
						}
					}
				);
			}else{ //success
				next(null,{'ErrorCode':0,'ErrorMessage':'','GetStatus':res});
			}
		}
	});
}
handler.GetBetTotal = function(msg,session,next){ //Redis
	var NowBetTotal=[0,0,0,0,0,0,0];

	async.waterfall([
		function(cb) {
			for(var i in NowBetTotal){
				NowBetTotal[i]=Math.floor(Math.random() *21+5)
			}
			cb(null,NowBetTotal.join())
		},
		function(cb){
			betDao.betSQLEX(cb);
		}
	], 
		function(err,res) {
			if(err) {
				next(new Error('random error'),500);
			}else{
				next(null,{'ErrorCode':0,'ErrorMessage':'','GetBetTotal':1});
			}
		}
	);
}

function getSn(num){ //唯一單號亂數
	sn = new Array();
	for(var i=0;i<num;i++)
		{
		sn[i]=Math.floor(Math.random() *10)
		}
	return sn.join("");
}

function formatDate() { //日期格式化
    var d = new Date(),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function formatDateTime() { //時間格式化
    var d = new Date(),
        h = d.getHours(),
        m = d.getMinutes(),
        s = d.getSeconds();

    if (h.length < 2) h = '0' + h;
    if (m.length < 2) m = '0' + m;
    if (s.length < 2) s = '0' + s;

    return [h, m, s].join(':');
}

