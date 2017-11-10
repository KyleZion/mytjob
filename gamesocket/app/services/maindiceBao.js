var pomelo = require('pomelo');

module.exports.mainGame = function(gameID,Period,endtime,dbmaster,dbslave,redis)
{
	var diceBaoService = require('./diceBaoService.js');
	var diceBaoInit = require('./diceBaoInit.js');
	var messageService = require('./messageService.js');
	var async =require('async')
	var status='';
		//進入流程控制 
		var EndTime = Date.parse(endtime);//Date.parse(data.rows[0].endtime);
		CheckTime = setInterval(function() 
		{
			var NowTime  = Date.parse(new Date());
			var Timeout = false;
			status ='T';
			if( NowTime>= EndTime)
			{
				Timeout = true;
				status = 'F';
				redis.hset('GS:GAMESERVER:diceBao', "Status", 'F');
				//關盤DB
				var struct_games = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))();
				var lib_gameClose = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("games_52",struct_games);
				struct_games.params.gas009 = 1;
				struct_games.where.gas003 = Period;
				lib_gameClose.Update(function(res){
					if(!res){
						console.log('關盤'+Period);
						messageService.broadcast('connector','GetStatus_diceBao',{'status':status});
					}
				});
			}
			if(Timeout)
			{                                                                                                                                                                                                                                                                                                                                                                                              
				clearInterval(CheckTime);
				var gameopx = setTimeout(function()
				{
					status='O';
					redis.hset('GS:GAMESERVER:diceBao', "Status", 'O');
					messageService.broadcast('connector','GetStatus_diceBao',{'status':status});
					console.log("Timeout");
					//clearTimeout(gameopx);
					async.waterfall([
						function(callback) {
							var gameNum = []
							gameNum[0] = Math.floor((Math.random() * 6) + 1);
							gameNum[1] = Math.floor((Math.random() * 6) + 1);
							gameNum[2] = Math.floor((Math.random() * 6) + 1);
							var tmp=0;
							for(var i=0;i<gameNum.length;i++){
								for(var j=i+1;j<gameNum.length;j++){
									if(gameNum[i]>gameNum[j]){
									tmp=gameNum[i];
									gameNum[i]=gameNum[j];
									gameNum[j]=tmp;
									}
								}
							}
							//console.log("52開獎號:"+gameNum);
							callback(null,gameNum);//將gameNum傳到第二層
						},
						function(gameNum,callback){
							var struct_gameop = new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))();
							var lib_gameop = new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("games_52",struct_gameop);
							struct_gameop.params.gas008 = gameNum[0]+','+gameNum[1]+','+gameNum[2];
							struct_gameop.where.gas003 = Period;
							lib_gameop.Update(function(res){
								if(!res){
									console.log('寫獎號完成:'+gameNum);
									setTimeout(function(){ messageService.broadcast('connector','gameop_diceBao',{'gameNum':gameNum});}, 20000);
									callback(null,gameNum);
								}
							});
						},
						function(gameNum,callback){
							//select 本期下注成功的注單
							dbslave.query('SELECT bet002,bet005,bet014 FROM bet_g52 where bet009 = ? and bet003 = ? order by id',[gameID,0],function(data){
								if(data.ErrorCode==0){
									//開始結算
									//var opBet =data.rows;
									diceBaoService.CalculateBet(dbmaster,dbslave,gameID,gameNum,data.rows,function(data){
										if(data.ErrorCode==0){
											callback(null,gameNum);
											console.log('結算完成');
										}
									});
								//DB amountlog
								//UPDATE 所有bet_g
								//CalculateBet-->idWinMoneysResult
								}
								});
						},
						function(gameNum,callback){
							//更新games gas012 已結算
							dbmaster.update('UPDATE games_52 SET gas012 = ? where gas003  = ?',[1,Period],function(data){	
								if(data.ErrorCode==0){
									console.log(Period+'期已結算結果');
									callback(null,gameNum);
								}
							});
						}
					],function(err, results) {
						if(err){
							console.log(err);
						}else{
							console.log('結算完20秒後送獎號到前台:'+results);
							//setTimeout(function(){ messageService.broadcast('connector','gameop_diceBao',{'gameNum':results});}, 20000);
						}
					});
					setTimeout(function(){ diceBaoInit.init(); }, 30000);
				}, 5000);
			}
		},2000);
}