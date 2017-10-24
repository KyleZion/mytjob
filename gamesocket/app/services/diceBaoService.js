var async = require('async');
var exp = module.exports;
var asyncLoop = require('node-async-loop');
var co =require('co');
var serverIP='127.0.0.1';
var playType=0;
var numSum=0;
exp.CalculateBet=function(dbclient,gamesID,gameNum,opBet,callback)
{
	async.waterfall([
		function(callback)
		{
			numSum=gameNum[0]+gameNum[1]+gameNum[2];
			callback(null,gameNum);
		},
		function(gameNum,callback){
			var winResult=[];
			var item=0;
			for(var i=0;i<opBet.length;i++){
				//var playType = opBet[i].bet011;
				switch(opBet[i].bet011){
					
					case 8001:
					case 8002:
					case 8003:
					case 8004:
					case 8005:
					case 8006://三同骰單一
						var playData=opBet[i].bet014.split(',')
						if(playData[0]==gameNum[0] && playData[1]==gameNum[1] && playData[2]==gameNum[2])
						{
							winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=180;
							item++;
						}
					break;
					case 8007://三同骰全骰
						if(gameNum[0]==gameNum[1] && gameNum[1]==gameNum[2] && gameNum[2]==gameNum[0])
						{
							winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=31;
							item++;
						}
					break;
					case 8008:
					case 8009:
					case 8010:
					case 8011:
					case 8012:
					case 8013://二同骰
					//先檢查開獎號是否
					if((gameNum[0]==gameNum[1]) || (gameNum[1]==gameNum[2] ))
					{
						var playData=opBet[i].bet014.split(',');
						var WinCount=0;
						for(var key in playData)
						{
							if((playData[key]==gameNum[0] && gameNum[0]==gameNum[1]) || (playData[key]==gameNum[1] && gameNum[1]==gameNum[2]))
							{
								WinCount++;
							}
						}
						if(WinCount==2)
						{
							winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=11;
							item++;
						}
					}
					break;
					case 8014:
					case 8015:
					case 8016:
					case 8017:
					case 8018:
					case 8019:
					case 8020:
					case 8021:
					case 8022:
					case 8023:
					case 8024:
					case 8025:
					case 8026:
					case 8027://和值
						var playData=opBet[i].bet014;
						if(playData==numSum)
						{
							winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=multipleDecide_Sum(numSum);
							item++;
						}
					break;
					case 8028:
					case 8029:
					case 8030:
					case 8031:
					case 8032:
					case 8033:
					case 8034:
					case 8035:
					case 8036:
					case 8037:
					case 8038:
					case 8039:
					case 8040:
					case 8041:
					case 8042://二不同骰
						var playData=opBet[i].bet014.split(',');
						if((playData[0]==gameNum[0] || playData[0]==gameNum[1] || playData[0]==gameNum[2]) && (playData[1]==gameNum[0] || playData[1]==gameNum[1] || playData[1]==gameNum[2]) )
						{
							winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=6;
							item++;
						}
					break;
					case 8043:
					case 8044:
					case 8045:
					case 8046:
					case 8047:
					case 8048://單一骰
						var playData=opBet[i].bet014;
						for(var key in gameNum)
						{
							if (playData==gameNum[key])
							{
								winResult[item]=opBet[i];
								winResult[item].Val=opBet[i].bet017;
								winResult[item].multiple=multipleDecide_Single(gameNum);
								item++;
							}
						}
					break;
					case 8049:
					case 8050:
					case 8051:
					case 8052://大小單雙
						var playData=opBet[i].bet014;
						var WinZone_1 =0;
						var WinZone_2 =0;
						 if(numSum>10)
						 {
						 	WinZone_1 =9010;
						 }else{
						 	WinZone_1 =9009;
						 }
						 if(numSum % 2 ==0)
						 {
						 	WinZone_2 =9008;
						 }else{
						 	WinZone_2 =9007;
						 }
						 if(playData==WinZone_1)
						 {
						 	winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=1;
							item++;
						 }
						 if(playData==WinZone_2){
						 	winResult[item]=opBet[i];
							winResult[item].Val=opBet[i].bet017;
							winResult[item].multiple=1;
							item++;
						 }
					break;
				}
			}			callback(null,winResult);
		},
			function(winResult,callback){
			console.log("開獎完畢:"+gamesID)
			dbclient.update('UPDATE bet_g52 SET betstate=1 where bet009 = ? and bet003 = ? ',[gamesID,0],function(data){
				if(data.ErrorCode==0){
					console.log("52開獎完畢進入派獎");
					callback(null,winResult);
				}
			});
			
		},
		function(winResult,callback){
			if(winResult.length!=0){
				idWinMoneysResult(dbclient,winResult,function(data){
					if(data.ErrorCode==0)
					callback(null,data.result);
				});	
			}else{
				callback(null,'52No One Win and No Enter idWinMoneysResult');
			}
		}
	],
		function(err,value){
			console.log("52idWinMoneysResultCallBack:")
			console.log(value);
			callback( {'ErrorCode': 0,'ErrorMessage': ''});
		});
}

function idWinMoneysResult(dbclient,winResult,callback_Win)
	{
		console.log(winResult);
		if(winResult.length==0){
			callback_Win( {'ErrorCode': 0,'ErrorMessage': '','result':null});
		}
		var award =0;
		// Get object key with: item.key 
		// Get associated value with: item.value 
		asyncLoop(winResult, function (item, next)
		{
			award=(item.Val * item.multiple)+ Number(item.Val);
			//var tmp=[item.bet002,item.bet005];
			async.waterfall([
				//先更新注單並寫入中獎金額
				function(callback){
					var args=[1,1,award,item.Val,0,item.bet002]
					dbclient.update('UPDATE bet_g52 SET betstate = ?, betwin = ?, bet032 = ?,bet033 = ? where bet003 = ? and bet002 = ?',args,function(data){
		    			if(data.ErrorCode==0){
		    				console.log("資料庫派獎betg52更新成功");
		    				callback(null,award);
		    			}
		  	 		});
				},
				//取得中獎注單帳號餘額
				function(award, callback){
					dbclient.query('SELECT mem100 FROM member where mem001 = ?',[item.bet005],function(data){
						if(data.ErrorCode==0){//開始結算
							console.log("52取餘額");
							console.log(data.rows[0].mem100);
							callback(null,data.rows[0].mem100,award);
						}
					});
				},
				//寫入amount_log
				function(memmoney, award, callback){
					var amountlogSqls=[];
					amountlogSqls=[22,item.bet002, 0,'CTL',0,item.bet005,'MAIN',memmoney,award,0,serverIP,'c','51',new Date().toLocaleDateString()];
					var sql="INSERT INTO member_amount_log (transfer_type, transfer_no, from_mid, from_gkey, from_balance, to_mid, to_gkey, to_balance, amount, operator, uip, otype, gameid, bydate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
					dbclient.insert(sql,amountlogSqls,function(data){
						if(data.ErrorCode==0){
						console.log('52insert amount_log success');
						callback(null,award);
						//console.log(amountlogSqls);
						}
					});
				},
				//最後再更新帳號餘額
				function(award, callback){
				 	dbclient.update('UPDATE member SET mem100 = mem100 + ? where mem001 = ?',[award,item.bet005],function(data){ 
		 		 		if(data.ErrorCode==0){
		   		 			console.log('52UPDATE mem success');
		   		 			/*for(var key in sockets){
		   		 				if(sockets[key].memberdata.id=item.bet005){
		   		 					sockets[key].memberdata.award=award;
		   		 					console.log(sockets[key].memberdata.award);
		   		 				}
		   		 			}暫時用不到*/
		   		 			callback(null,0);
		   		 		}
		   		 	});
				}
				//錯誤則顯示沒有則返回
			],	function (err, result) {
				if(err){
					callback_Win(1,err);
				}

			});

		    next();
		}, function ()
		{
			callback_Win( {'ErrorCode': 0,'ErrorMessage': '','result':'Finished!!'});
		});
	}
var multipleDecide_Sum = function(numSum){
		if(numSum==4 || numSum==17)
			return 62;
		if(numSum==5 || numSum==16)
			return 31;
		if(numSum==6 || numSum== 15)
			return 18;
		if(numSum==7 || numSum==14)
			return 12;
		if(numSum==8 || numSum==13)
			return 8;
		if(numSum==9 || numSum==12)
			return 7;
		if(numSum==10 || numSum==11)
			return 6;
}
var multipleDecide_Single = function(gameNum){
	if(gameNum[0]==gameNum[1] && gameNum[1]==gameNum[2] && gameNum[2]==gameNum[0]){
		return 3;
	}
	if((gameNum[0]==gameNum[1] && gameNum[0]!=gameNum[2])||(gameNum[1]==gameNum[2] && gameNum[1]!=gameNum[0])){
		return 2;
	}
	if(gameNum[0]!=gameNum[1] && gameNum[1]!=gameNum[2] && gameNum[2]!=gameNum[0]){
		return 1;
	}
	
}