var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var async = require('async');
var utils = require('../util/utils');
dbslave = pomelo.app.get('dbslave');
dbmaster = pomelo.app.get('dbmaster');
var gameDao = module.exports;

gameDao.getGameId = function(CasinoId,cid,cb){
	var sql = 'SELECT id from games_'+CasinoId+' where gas004 = ? and gas009 = ? order by id desc limit 1';
	var args = [cid,0];
	dbslave.query(sql,args,function(res) {
		if(res.ErrorCode !=  0) {
			utils.invokeCallback(cb, res.ErrorMessage, null);
		} else {
			if (!!res) {
				var rs = res.rows[0];
				utils.invokeCallback(cb, null, rs.id);
			} else {
				utils.invokeCallback(cb, null,res);
			}
		}
	});
}

gameDao.getGameSet = function(CasinoId,cid,cb){
	var sql = 'SELECT gas003 from games_'+CasinoId+' where gas004 = ? and gas009 = ? order by id desc limit 1 ';
	var args = [cid,0];
	dbslave.query(sql,args,function(res) {
		if(res.ErrorCode !=  0) {
			utils.invokeCallback(cb, res.ErrorMessage, null);
		} else {
			if (!!res) {
				var rs = res.rows[0];
				utils.invokeCallback(cb, null, rs.gas003);
			} else {
				utils.invokeCallback(cb, null,res);
			}
		}
	});
}

gameDao.getMoney = function(mid,cb){
	var sql = 'SELECT mem100 from users where mid = ?';
	var args = [mid];
	dbslave.query(sql,args,function(res) {
		//console.log(res);
		if(res.ErrorCode !=  0) {
			utils.invokeCallback(cb, res.ErrorCode, res.ErrorMessage);
		} else {
			var rs = res.rows;
			if (rs.length==1) {
				utils.invokeCallback(cb, null, rs[0].mem100);
			} else {
				utils.invokeCallback(cb, null, 0 );
			}
		}
	});
}

gameDao.getTimezone = function(nowTime,cid,CasinoId,cb){
	var sql='SELECT id,(NOW()) as nowtime ,stop as endtime FROM games_'+CasinoId+' where gas004 = ? ORDER BY id DESC LIMIT 1'
	var args = [cid];
	dbslave.query(sql,args,function(res) {
		//console.log(res);
		if(res.ErrorCode !=  0) {
			utils.invokeCallback(cb, res.ErrorMessage, null);
		} else {
			if (!!res) {
				var rs = res.rows[0];
				var timezone =(Date.parse(rs.endtime)-Date.parse(nowTime))/1000;
				utils.invokeCallback(cb, null, timezone);
			} else {
				utils.invokeCallback(cb, null,res);
			}
		}
	});
}

gameDao.getHistory = function(count,CasinoId,cb){
	var sql='SELECT gas008 FROM games_'+CasinoId+' where gas008 <> ? order by id desc limit '+count+'';
	var args=[""];
	dbslave.query(sql,args,function(res) {
		//console.log(res);
		if(res.ErrorCode !=  0) {
			utils.invokeCallback(cb, res.ErrorMessage, null);
		} else {
			if (!!res) {
				var history='';
				for (var key in res.rows){
					history=history+res.rows[key].gas008+',';
				}
				history=history.substring(0,history.length-1);
				utils.invokeCallback(cb, null, history);
			} else {
				utils.invokeCallback(cb, null,res);
			}
		}
	});
}

gameDao.getStatus = function(cid,CasinoId,cb){
	var sql='SELECT stop as endtime FROM games_'+CasinoId+' WHERE gas004 = ? ORDER BY id DESC LIMIT 1'
	var args=[cid];
	var status='F';
	dbslave.query(sql,args,function(res) {
		//console.log(res);
		if(res.ErrorCode !=  0) {
			utils.invokeCallback(cb, res.ErrorMessage, null);
		} else {
			if (!!res) {
				var NowTime  = Date.parse(new Date());
				var EndTime = Date.parse(res.rows[0].endtime);
				var c = (Date.parse(res.rows[0].endtime)-Date.parse(new Date()))/1000;
				if(c > 0){
					status='T';
				}
				else if(c <= -5){
					status='O';
				}
				else{
					status='F';
				}
				utils.invokeCallback(cb, null, status);
			} else {
				utils.invokeCallback(cb, null,res);
			}
		}
	});
}
gameDao.addMoney = function(betTotal,mid,cb){
	var sql = 'UPDATE users SET mem100 = mem100 + ? where mid = ?';
	var args=[betTotal,mid];
	dbmaster.update(sql,args,function(res){
		if(res.ErrorCode==0){
			utils.invokeCallback(cb, 0, 200);
		}else{
			utils.invokeCallback(cb, 1 , 500);
		}
	});
}
gameDao.lowerMoney = function(betTotal,mid,cb){
	var sql = 'UPDATE users SET mem100 = mem100 - ? where mid = ?';
	var args=[betTotal,mid];
	dbmaster.update(sql,args,function(res){
		if(res.ErrorCode==0){
			utils.invokeCallback(cb, 0, 200);
		}else{
			utils.invokeCallback(cb, 1 , 500);
		}
	});
}
gameDao.delBet = function(mid,gid,cid,cb){
	var sql = 'DELETE FROM bet_g51 where bet005 = ? and bet009 = ? and bet012 = ?';
	var args=[mid,gid,cid];
	dbmaster.delete(sql,args,function(res){
		if(res.ErrorCode==0){
			utils.invokeCallback(cb, 0, 200);
		}else{
			utils.invokeCallback(cb, 1 , 500);
		}
	});
}

gameDao.delAmountlogBytranNo = function(transfer_no,cb){
	var sql = 'DELETE FROM amount_log where transfer_no = ? and transfer_type = 3';
	var args=[transfer_no];
	dbmaster.delete(sql,args,function(res){
		if(res.ErrorCode==0){
			utils.invokeCallback(cb, 0, 200);
		}else{
			utils.invokeCallback(cb, 1 , 500);
		}

	});
}

gameDao.delAmountlogById = function(Id,cb){
	var sql = 'DELETE FROM amount_log where id = ? and transfer_type = 3';
	var args=[Id];
	dbmaster.delete(sql,args,function(res){
		if(res.ErrorCode==0){
			utils.invokeCallback(cb, 0, 200);
		}else{
			utils.invokeCallback(cb, 1 , 500);
		}

	});
}