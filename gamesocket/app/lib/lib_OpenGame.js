module.exports = function lib_OpenGame(pomelo,app,async,redis,dbslave,dbmaster,messageService,GameName,GameShowName,GameID,GameZone){

	//console.log("lib_OpenGame:"+GameZone);
	// ------ games -------------------------------------------------------------
	// 設定Games 狀態 為已經結算
	this.UpdateGamesStatusToCalculated= function(callback,AutoIndex){
		dbmaster.update('UPDATE games_'+GameID+' SET gas012 = ? where id = ? and gas004 = ?',[1,AutoIndex,GameZone],function(data){	
			if(data.ErrorCode==0)
				callback(true);
			else
				callback(false);
		});
	}
	// 新增期數
	this.InsertPeriod= function(callback,Period,start,stop){
		var struct_games = GetStruct_SQL();
		struct_games.params.gas002 = GameID;
		struct_games.params.gas003 = Period;
		struct_games.params.gas004 = GameZone;
		struct_games.params.start = start;
		struct_games.params.stop = stop;
		struct_games.params.gas009 = 0;
		struct_games.params.created_at = start;
		struct_games.params.updated_at = start;
		var init_Game = GetLibSQL_games(struct_games);
		init_Game.Insert(function(res){
			if(!!res){
				InsertID=res;
				callback(InsertID);
			}
			else{
				callback(0);
			}
		});
	}
	// 取得歷史開獎號碼--水果盤
	this.GetHistoryNumber= function(callback,limit)
	{
		var sql='SELECT gas008 FROM games_'+GameID+' where gas008 <> ? and gas004 = ? order by id desc limit ?';
		var args=["",GameZone,limit];
		dbslave.query(sql,args,function(data){
			if(data.ErrorCode==0){
				var gameHistory = "";
				for (var key in data.rows){
					gameHistory=gameHistory+data.rows[key].gas008+',';
				}
				gameHistory=gameHistory.substring(0,gameHistory.length-1);
				callback(gameHistory);
			}
			else
			{
				callback("");
			}
		});
	}
	this.GetHistoryNumberTable= function(callback,limit)
	{
		var sql='SELECT gas008 FROM games_'+GameID+' where gas008 <> ? and gas004 = ? order by id desc limit ?';
		var args=["",GameZone,limit];
		dbslave.query(sql,args,function(data){
			if(data.ErrorCode==0){
				var gameHistory = "";
				for (var key in data.rows){
					gameHistory=gameHistory+data.rows[key].gas008+'|';
				}
				gameHistory=gameHistory.substring(0,gameHistory.length-1);
				callback(gameHistory);
			}
			else
			{
				callback("");
			}
		});
	}
	this.GetLobbyHistoryNumberTable= function(callback,limit)
	{
		var sql='SELECT gas008 FROM games_'+GameID+' where gas008 <> ? and gas004 = ? order by id desc limit ?';
		var args=["",GameZone,limit];
		dbslave.query(sql,args,function(data){
			if(data.ErrorCode==0){
				var lobbyHistory = "";
				for (var key in data.rows){
					lobbyHistory = lobbyHistory+data.rows[key].gas008;
					lobbyHistory = lobbyHistory.substring(0,lobbyHistory.length-2);
					lobbyHistory = lobbyHistory+'|'
				}
				lobbyHistory=lobbyHistory.substring(0,lobbyHistory.length-1);
				callback(lobbyHistory);
			}
			else
			{
				callback("");
			}
		});
	}
	// 新增開獎號碼
	this.InsertNumber= function(callback,AutoIndex,gameNum){
		var struct_gameop = GetStruct_SQL();
		var lib_gameop = GetLibSQL_games(struct_gameop);
		struct_gameop.params.gas008 = gameNum;
		struct_gameop.where.gas004 = GameZone;
		struct_gameop.where.id = AutoIndex;
		lib_gameop.Update(function(res){
			if(!res)
				callback(true);
			else
				callback(false);
		});
	}
	// 取得所有沒有開獎的期數
	this.GetUnOpenGames = function(callback){
		var Sql = 'SELECT id FROM games_'+GameID+' where gas004 = ? and gas012 = 0 ';
		console.log("GetUnOpenGames"+Sql);
		dbslave.query('SELECT id FROM games_'+GameID+' where gas004 = ? and gas012 = 0 ',[GameZone],function(data){
			if(data.ErrorCode==0)
				callback(data.rows);
			else
				callback(null);
		});
	}

	// ------ betg -------------------------------------------------------------
	// 	設定betg 注單 狀態 為已經 開獎
	this.UpdateBetStatusToOpened= function(callback,PeriodID){
		dbmaster.update('UPDATE bet_g'+GameID+' SET betstate = 1 where bet009 = ? and bet003 = ? and bet012= ? ',[PeriodID,0,GameZone],function(data){
			if(data.ErrorCode==0){
				callback(true);
			}else{
				callback(false);
			}
		});
	}
	// 	依照期數取得所有注單
	this.GetBets= function(callback,PeriodID){
		dbslave.query('SELECT bet002,bet005,bet014,bet016,bet017 FROM bet_g'+GameID+' where bet009 = ? and bet003 = ? and bet012 = ? order by id',[PeriodID,0,GameZone],function(data){
			if(data.ErrorCode==0)
				callback(data.rows);
			else
				callback(null);
		});
	}
	// 取得所有為開獎注單
	this.GetUnOpenBets = function(callback){
		dbslave.query('SELECT bet002,bet005,bet014,bet016,bet017 FROM bet_g'+GameID+' where bet012 = ? order by id',[0],function(data){
			if(data.ErrorCode==0)
				callback(data.rows);
			else
				callback(null);
		});
	}
	// 設定注單為中獎
	this.SetBetsToWin = function(callback,AutoIndexID,WinMoney,WinBets){
		var struct_betgop = GetStruct_SQL();
		var lib_gameop = GetLibSQL_betg(struct_betgop);
		struct_betgop.params.betstate = 1;
		struct_betgop.params.betwin = 1;
		struct_betgop.params.bet032 = WinMoney;
		struct_betgop.params.bet033 = WinBets;
		struct_betgop.where.id = AutoIndexID;
		struct_betgop.where.bet003 = 0;
		struct_betgop.where.bet012 = GameZone;
		lib_gameop.Update(function(res){
			if(!res){
				callback(true);
			}else{
				callback(false);
			}
		});
	}

	// ------ Money & Log -------------------------------------------------------------
	this.GetUserMoneyMaster = function(callback,mid){
		dbmaster.query('SELECT mem100 FROM users where mid = ?',[mid],function(data){ //duegame
			if(data.ErrorCode==0){
				callback(data.rows[0].mem100); 
			}else{
				callback(null);
			}
		});
	}
	this.UpdateUserMoneyMaster = function(callback,mid,shiftMoney){
		dbmaster.update('UPDATE users SET mem100 = mem100 + ? where mid = ?',[shiftMoney,mid],function(data){  //egame
	 		if(data.ErrorCode==0){
	 			callback(true);
	 		}else{
	 			callback(false);
	 		}
	 	});
	}
	this.InsertBetsAmountLog = function(callback,type,PeriodID,transfer_no,mid,shiftMoney,balance){
		var struct_amount = GetStruct_SQL(); //amount_log SQL
		struct_amount.params.type = type;//4;
		struct_amount.params.game_id = GameID;
		struct_amount.params.game_name = PeriodID;
		struct_amount.params.transfer_no = transfer_no;
		struct_amount.params.mid = mid;
		struct_amount.params.money = shiftMoney;
		struct_amount.params.balance = memmoney;
		struct_amount.params.created_at = formatDate()+" "+formatDateTime();
		struct_amount.params.updated_at = formatDate()+" "+formatDateTime();
		var lib_amount = GetLibSQL_amountlog(struct_amount);
		lib_amount.Insert(function(id){
			if(!!id){
		      	callback(true);
			}else{
		      	callback(false);
			}
	    	
	    });
	}


	// ------ -------------------------------------------------------------
	function GetStruct_SQL(){
		return new (require(pomelo.app.getBase()+'/app/lib/struct_sql.js'))();
	}
	function GetLibSQL_games(Struct_SQL){
		return new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("games_"+GameID,Struct_SQL)
	}
	function GetLibSQL_betg(Struct_SQL){
		return new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("bet_g"+GameID,Struct_SQL)
	}
	function GetLibSQL_amountlog(Struct_SQL){
		return new (require(pomelo.app.getBase()+'/app/lib/lib_SQL.js'))("amount_log",Struct_SQL)
	}
	// ------ -------------------------------------------------------------




}