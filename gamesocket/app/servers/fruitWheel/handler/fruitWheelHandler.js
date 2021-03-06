const pomelo=require('pomelo');
const logger = require('pomelo-logger').getLogger('fruitlog',__filename);

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};
//===固定==============================================================
const handler = Handler.prototype;
const redis=pomelo.app.get('redis');
const dbmaster=pomelo.app.get('dbmaster');
const dbslave=pomelo.app.get('dbslave');
const async=require('async');
const md5 = require('md5');
const messageService = pomelo.app.get('messageService');
const sessionService = pomelo.app.get('sessionService');
const casinoId='051';
const gameDao = require(pomelo.app.getBase()+'/app/dao/gameDao');
const lib_games = new (require(pomelo.app.getBase()+'/app/lib/lib_games.js'))(); //扣款寫入member_amount_log,回傳amount_log Index ID
const PUB = new(require(pomelo.app.getBase()+'/app/lib/public_fun.js'))();
//===固定==============================================================

handler.bet = function(msg,session,next){
	var tmp = JSON.parse(msg.bet); //將C2傳來的下注內容string轉JSON
	var betData = null; //下注內容
	betData=tmp.data; //取JSON data
	const gameID=betData.GamesID;
	const channelID = betData.channelID;
	var odds = 1;
	var amount = 0;//下注總金額
	var betValue =[0,0,0,0,0,0,0]; //各注數 
	var periodBetTotal =[0,0,0,0,0,0,0]; //寫入本局總下注額
	var betkey=''; 
	var bet2='';
	var trans_no='';
	var logId = 0;
	var b015 = 0;
	var struct_bet = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))(); //bet_g SQL
	//計算下注總金額以及下注內容轉資料庫格式key0~6為下注號碼
	/*async function betData(){
		const BD = await new Promise((resolve,reject) =>{
			for(var i=0;i<=6;i++){
				if(betData[i]!=0){
					amount= amount+betData[i]; //計算下注總金額
					betValue[i]=betData[i];
					periodBetTotal[i]=betData[i];
				}
			}
		});
	}

	async function channelOdds(){
		b015 = amount;
		switch(channelID){
			case 101:
				callback_Z(null,0);
				break;
			case 102:
				amount = amount * 2 ; 
				odds = 2;
				callback_Z(null,0);
				break;
			case 105:
				amount = amount * 5;
				odds = 5;
				callback_Z(null,0);
				break;
			case 110:
				amount = amount * 10;
				odds = 10;
				callback_Z(null,0);
				break;
		}
	}*/
	async.series({
		Y: function(callback_Y){
			for(var i=0;i<=6;i++){
				if(betData[i]!=0){
					amount= amount+betData[i]; //計算下注總金額
					betValue[i]=betData[i];
					periodBetTotal[i]=betData[i];
				}
			}
			callback_Y(null,0)
		},
		Z: function(callback_Z){
			b015 = amount;
			switch(channelID){
				case 101:
					callback_Z(null,0);
					break;
				case 102:
					amount = amount * 2 ; 
					odds = 2;
					callback_Z(null,0);
					break;
				case 105:
					amount = amount * 5;
					odds = 5;
					callback_Z(null,0);
					break;
				case 110:
					amount = amount * 10;
					odds = 10;
					callback_Z(null,0);
					break;
			}
		},
		//=============================================================
		A:function(callback_A){
			var struct_amount = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))(); //amount_log SQL
			struct_amount.params.type = 3;
			struct_amount.params.game_id = '51';
			struct_amount.params.game_name = gameID;
			struct_amount.params.mid = session.uid;
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
			betkey=casinoId+session.uid+new Date().getTime();
			bet2=betkey+'0001';
			trans_no=bet2;
			var md5str = session.uid+gameID;
			struct_bet.params.betkey = betkey;
			struct_bet.params.betstate = 0;
			struct_bet.params.betwin = 0;
			struct_bet.params.bet002 = bet2;
			struct_bet.params.bet003 = 0;
			struct_bet.params.bet005 = session.uid;
			struct_bet.params.bet009 = gameID;
			struct_bet.params.bet011 = 1151;
			struct_bet.params.bet012 = channelID;
			struct_bet.params.bet014 = betValue;
			struct_bet.params.bet015 = b015;
			struct_bet.params.bet016 = odds;
			struct_bet.params.bet017 = amount;
			struct_bet.params.bet018 = 0;
			struct_bet.params.bet034 =md5(md5str);
			struct_bet.params.bydate =PUB.formatDate()
			struct_bet.params.created_at = PUB.formatDate()+" "+PUB.formatDateTime();
			struct_bet.params.updated_at = PUB.formatDate()+" "+PUB.formatDateTime();
			callback_B(null,0);
			//var checkSn=true; 
			//檢查唯一單號 2017-02-05 VIC 去除迴圈query比對單號問題
			/*async.whilst(
				function() //test function: while test is true
				{ return checkSn; },
				function(callback) {
					dbslave.query('SELECT id from bet_g51 where bet002 = ?',[betkey+'0001'],function(data){
						if(data.ErrorCode== 0)
						{ //如果有資料則return true 無則return false
							if(data.rows.length== 0)
							{
								//console.log('單號未重複');
								checkSn=false;
								bet2=betkey+'0001';
								trans_no=bet2;
								var md5str = session.uid+gameID;
								struct_bet.params.betkey = betkey;
								struct_bet.params.betstate = 0;
								struct_bet.params.betwin = 0;
								struct_bet.params.bet002 = bet2;
								struct_bet.params.bet003 = 0;
								struct_bet.params.bet005 = session.uid;
								struct_bet.params.bet009 = gameID;
								struct_bet.params.bet011 = 1151;
								struct_bet.params.bet012 = channelID;
								struct_bet.params.bet014 = betValue;
								struct_bet.params.bet015 = b015;
								struct_bet.params.bet016 = odds;
								struct_bet.params.bet017 = amount;
								struct_bet.params.bet018 = 0;
								struct_bet.params.bet034 =md5(md5str);
								struct_bet.params.bydate =PUB.formatDate()
								struct_bet.params.created_at = PUB.formatDate()+" "+PUB.formatDateTime();
								struct_bet.params.updated_at = PUB.formatDate()+" "+PUB.formatDateTime();
								callback(null,checkSn);
							}else{
								betkey=gid+PUB.getSn(13);
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
			);*/
		},
		C: function(callback_C){
			var lib_bet = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("bet_g51",struct_bet);
			lib_bet.Insert(function(res)
			{
				if(!!res)
				{
					//console.log(res);
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
			var lib_amount = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("amount_log",struct_amount);
			lib_amount.Update(function(res)
			{
			    if(res===0)
			    {
				    console.log('UPDATE transfer_no success');
					callback_D(null,res);	
			    }else{
					async.parallel([
						function(cb){
							gameDao.delBet(session.uid,gameID,channelID,cb);
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
				async.waterfall([
					/*function(cb) //此為寫入該期數下注額用於前端顯示遊戲中有其他人下注之實際情況，目前以假資料代替
					{
						redis.hget('GS:GAMESERVER:fruitWheel', "NowbetTotal"+channelID,function(err,res){
							if(err){

							}else{
								var tmp= res.split(",");
								var redisTotal =periodBetTotal.map(function(element,index,periodBetTotal){
									return Number(tmp[index])+Number(element);
								});
								redis.hset('GS:GAMESERVER:fruitWheel', "NowbetTotal"+channelID,redisTotal.join(","));
								cb(null);
							}
						});
					},*/
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
							redis.hset('GS:USER:'+session.uid, "ALIVE_TIME",PUB.formatDate()+" "+PUB.formatDateTime());
							next(null,{'ErrorCode':0,'ErrorMessage':'','bet': resDao});
						}
					}
				);
			}
	});
	
}

handler.GetGameID =function(msg,session,next){
	redis.hget('GS:GAMESERVER:fruitWheel', "GameID"+msg.cid, function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{
			if(res==null){
				async.waterfall([
					function(cb) {
						gameDao.getGameId(51,msg.cid,cb);
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
handler.GetGameSet =function(msg,session,next){
	redis.hget('GS:GAMESERVER:fruitWheel', "GameSet"+msg.cid, function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{
			if(res==null){
				async.waterfall([
					function(cb) {
						gameDao.getGameSet(51,msg.cid,cb);
					}
				], 
					function(err,resDao) {
						if(err) {
							next(new Error('SQL error'),500);
						}else{
							var GameSet = resDao.substring(8)
							next(null,{'ErrorCode':0,'ErrorMessage':'','GameSet':GameSet});
						}
					}
				);
			}else{ //success
				next(null,{'ErrorCode':0,'ErrorMessage':'','GameSet':msg.cid+res});
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
	var nowtime = PUB.formatDate()+" "+PUB.formatDateTime();
	redis.hget('GS:GAMESERVER:fruitWheel', "endTime"+msg.cid, function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{
			if(res==null){
				async.waterfall([
					function(cb) {
						gameDao.getTimezone(nowtime,msg.cid,cb);
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

handler.GetHistory = function(msg,session,next){ 
	switch(msg.count){
		case 10:
			redis.hget('GS:GAMESERVER:fruitWheel', "gameHistory"+msg.cid, function (err, res) {
				if(err){
					next(new Error('redis error'),500);
				}else{
					if(res==null){
						async.waterfall([
							function(cb) {
								gameDao.getHistory(msg.count,cb);
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
		case 30:
			redis.hgetall('GS:GAMESERVER:fruitWheel', function (err, res) {
				if(err){
					next(new Error('redis error'),500);
				}else{
					if(res==null){
						async.waterfall([
							function(cb) {
								gameDao.getHistory(msg.count,cb);
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
						var record = new Array();
						record[0] = res.lobbyHistory101;
						record[1] = res.lobbyHistory102;
						record[2] = res.lobbyHistory105;
						record[3] = res.lobbyHistory110;
						console.log(record);
						next(null,{'ErrorCode':0,'ErrorMessage':'','History':record});
					}
				}
			});
			break;
		default:
			next(null,{'ErrorCode':0,'ErrorMessage':'','History':'undefined'});
	}
}

handler.GetStatus = function(msg,session,next){  //Redis
	if(msg.cid==0){ //VIC:尚須修正lobby取狀態
		redis.hgetall('GS:GAMESERVER:fruitWheel', function (err, res) {
				if(err){
					next(new Error('redis error'),500);
				}else{
					if(res==null){
						async.waterfall([
							function(cb) {
								gameDao.getStatus(0,cb);
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
						var record = new Array();
						record[0] = res.Status101;
						record[1] = res.Status102;
						record[2] = res.Status105;
						record[3] = res.Status110;
						next(null,{'ErrorCode':0,'ErrorMessage':'','GetStatus':record});
					}
				}
		});
	}else{
		redis.hget('GS:GAMESERVER:fruitWheel', "Status"+msg.cid, function (err, res) {
			if(err){
				next(new Error('redis error'),500);
			}else{
				if(res==null){
					async.waterfall([
						function(cb) {
							gameDao.getStatus(msg.cid,cb);
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
}
handler.GetBetTotal = function(msg,session,next){ //Redis
	redis.hget('GS:GAMESERVER:fruitWheel', "NowbetTotal"+msg.cid, function (err, res) {
		if(err){
			next(new Error('redis error'),500);
		}else{//success
			next(null,{'ErrorCode':0,'ErrorMessage':'','GetBetTotal':res});	
		}
	});
}
handler.AddtoChannel = function(msg,session,next){
	var channelService = pomelo.app.get('channelService').getChannel(msg.ChannelID,  true);
	channelService.add(session.uid,session.frontendId);//加入channel,房間
	messageService.pushMessageToPlayer({uid:session.uid, sid:'connector-server-1'},'ChannelChange',{'cid':msg.ChannelID}); //觸發該玩家監聽訊息function
	var odds = PUB.getOddsbyChannel(msg.ChannelID);
	next(null,{'ErrorCode':0,'ErrorMessage':'','cid':msg.ChannelID,'odds':odds});//回傳區號,賠率
}
handler.LeaveChannel = function(msg,session,next){
	if(msg.ChannelID==0)
	{
		next(null,{'ErrorCode':0,'ErrorMessage':'','cid':'','odds':0});
	}
	var channelService = pomelo.app.get('channelService').getChannel(msg.ChannelID,  false);
	channelService.leave(session.uid,session.frontendId);
	messageService.pushMessageToPlayer({uid:session.uid, sid:'connector-server-1'},'ChannelChange',{'cid':0});
	next(null,{'ErrorCode':0,'ErrorMessage':'','cid':'','odds':0});
}
