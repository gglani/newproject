var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var fileUpload = require('express-fileupload');
var assert = require('assert');
var mongourl = 'mongodb://admin:admin@ds115798.mlab.com:15798/restaurant';

app = express();
var o_id=null;
var deletedoc=false;
var rates = [{}];
var users = new Array(
	{name: 'demo', password: ''},
	{name: 'guest', password: 'guest'}
);


app.set('view engine','ejs');

app.use(session({
  name: 'session',
  keys: ['SECRETKEY1','SECRETKEY2']
}));
/*app.use(fileUpload());*/
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));



/*app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	}
	res.status(200).end('Hello, ' + req.session.username +
	  '!  This is a secret page!');
});*/

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
		}
	}
	res.redirect('/read');
});


app.get('/read',function(req,res){
	
	MongoClient.connect(mongourl,function(err,db){
    	console.log('Connected to db');
   	 assert.equal(null,err);
   	 var rest = [];
    	cursor = db.collection('restaurant').find({}, {"name" : 1, "id" : 1});
    	cursor.each(function(err, doc) {
      	assert.equal(err, null); 
      	if (doc != null) {
        rest.push(doc);
      } else {
        res.render("restlist.ejs", {"rest" : rest});
        res.end();
        db.close();
      }  
    });
  });
});
// middlewares
app.use(fileUpload());
app.use(bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true}));   // to support URL-encoded bodies
  
app.post('/create', function(req, res) {
	var rate = null;
	var sampleFile;
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

    MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to db');
      assert.equal(null,err);
      create(db,req.body.name,req.body.borough,req.body.cuisine,req.body.street,req.body.building,req.body.zipcode,req.body.gpslon,req.body.gpslat,
req.files.sampleFile,rate,req.session.username, function(result) {
        db.close();
        if (result.insertedId != null) {
          var bfile = req.files.sampleFile;
	  var mimetype = bfile.mimetype;
	  var imageToshow = "data:"+mimetype+";base64,"+bfile;

          res.status(200);
	  res.writeHead(200,{"Content-Type":"text/html"});
	  res.write("<html><body>");
	  res.write("<h1>Name:"+req.body.name+"</h1>");
	  res.write("<img src=" +imageToshow+"></img>");//
	  res.write("Cuisine:"+req.body.cuisine+"</br>");
	  res.write("Street:"+req.body.street+"</br>");
	  res.write("Building:"+req.body.building+"</br>");
	  res.write("Zipcode:"+req.body.zipcode+"</br>");
	  res.write("GPS:["+req.body.gpslon+","+req.body.gpslat+"]"+"</br>");
	  res.write("Rating:"+ rate+"</br>");
	  res.write("Created by:"+ req.session.username+"</br>");
	  res.write("<a href=\"/read\">Back</a>");
	  res.end("</body><html>");	
          //res.end('Inserted: ' + result.insertedId)
        } else {
          res.status(500);
          res.end(JSON.stringify(result));
        }
      });
    });
 	
 });

function create(db,name,borough,cuisine,street,building,zipcode,gpslon,gpslat,bfile,rate,author,callback) {
  console.log(bfile);
  db.collection('restaurant').insertOne({
    "name" : name,
    "borough" : borough,
    "cuisine": cuisine,
    "address":{"street": street, "building" : building, "zipcode" :zipcode,
	"coord":[gpslon,gpslat]},
    "data" : new Buffer(bfile.data).toString('base64'),
    "mimetype" : bfile.mimetype,
    "rates":[{"rate_name":null,"rate":null}],
    "author":author
	 
  }, function(err,result) {
    //assert.equal(err,null);
    if (err) {
      console.log('insertOne Error: ' + JSON.stringify(err));
      result = err;
    } else {
      console.log("Inserted _id = " + result.insertId);
	
    }
    callback(result);
  });
}

app.get('/showdetails', function(req,res) {
  MongoClient.connect(mongourl,function(err,db) {
    console.log('Connected to db');
    console.log('Finding key = ' + req.query.name);
	//o_id = ObjectId.valueOf(req.query._id);
    console.log('Finding key = ' + o_id);
    assert.equal(null,err);
     
     var bfile = null;
     var mimetype = null;
     
     o_id= null;
	
    if (req.query.name != null) {
      db.collection('restaurant').findOne({"name" : req.query.name}, function(err, doc){
      assert.equal(err, null); 
	
      	console.log('o_id@/ = ' + o_id);
	if (doc != null) {
	if(doc.data!=null){
	bfile = doc.data
	mimetype = doc.mimetype;
	imageToshow = "data:"+mimetype+";base64,"+bfile;}
	
	if (doc!=null&&doc.author==req.session.username){
	deletedoc=true;
	console.log('deletedoc:'+deletedoc);
	}
	o_id = doc._id;
	rates = doc.rates;
	//console.log('rates:'+rates.length);
        res.render("restdetail.ejs", {name:doc.name,borough:doc.borough,cuisine:doc.cuisine,street:doc.address.street,building:doc.address.building,zipcode:doc.address.zipcode,coordX:doc.address.coord[0],coordY:doc.address.coord[1],"rates":rates,zoom:18,photo:imageToshow,_id:doc._id});
	 
	 console.log('doc_id:'+ doc._id);
	console.log('o_id:'+ o_id);
	
        //res.render("gmap.ejs",{lat:doc.coord[0],lon:doc.coord[1],zoom:18});
        //res.end();
      }
	
      db.close();
    });
      
    } else {
      res.status(500);
      res.end('Error: query parameter "key" is missing!');
    }
  });
});

app.get('/change',function(req,res){
    MongoClient.connect(mongourl,function(err,db){
	console.log('connected to db');
	//o_id = new ObjectId(req.query._id);
	console.log('o_id@/change = ' + o_id);
	 
	assert.equal(null,err);
	   if (req.query._id!=null){
		console.log('get session name = ' + req.session.username)
	     db.collection('restaurant').findOne({"_id":o_id},function(err,doc){
		
		if (doc!=null&&doc.author==req.session.username){
		
		
			res.render("editform.ejs", {name:doc.name,borough:doc.borough,cuisine:doc.cuisine,street:doc.address.street,building:doc.address.building,zipcode:doc.address.zipcode,coordX:doc.address.coord[0],coordY:doc.address.coord[1]});		    
}else{ 	      //^end if (doc!=null...
	
	res.end("[Auth]Not owner of this post");
}
	db.close();
});
}else{   //^end if (req.query._id!=null)...
      res.status(500);
      res.end('Error: query parameter "key" is missing!');
	}		
});
});

/*// middlewares
app.use(fileUpload());
app.use(bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true}));  // to support URL-encoded bodies*/

app.post('/change',function(req,res){	
var rate = null;
	//var sampleFile;
    //var o_id = ObjectId(req.query._id);
    if (!req.files) {
        res.send('No files were uploaded.');
        return ;
    }

    MongoClient.connect(mongourl,function(err,db) {
      console.log('Connected to db');
      console.log('o_id@/change(post):'+o_id);
      //console.log('req.body.borough:'+req.body.borough);
      assert.equal(null,err);
      
      update(db,o_id,req.body.name,req.body.borough,req.body.cuisine,req.body.street,req.body.building,req.body.zipcode,req.body.gpslon,req.body.gpslat,
req.files.sampleFile,rates,req.session.username, function(result) {
          db.close();
	  if(result!=null){
	  //console.log('req.body.borough:'+result.borough);
          var bfile = req.files.sampleFile;
	  var mimetype = bfile.mimetype;
	  var imageToshow = "data:"+mimetype+";base64,"+bfile;
	
          res.status(200);
	  res.writeHead(200,{"Content-Type":"text/html"});
	  res.write("<html><body>");
	  res.write("<h1>Name:"+req.body.name+"</h1>");
	  
	  res.write("Cuisine:"+req.body.cuisine+"</br>");
	  res.write("Street:"+req.body.street+"</br>");
	  res.write("Building:"+req.body.building+"</br>");
	  res.write("Zipcode:"+req.body.zipcode+"</br>");
	  res.write("GPS:["+req.body.gpslon+","+req.body.gpslat+"]"+"</br>");
	  res.write("Rating:"+ rate+"</br>");
	  res.write("Created by:"+ req.session.username+"</br>");
	  res.write("<a href=\"/read\">Back</a>");
	  res.end("</body><html>");	
          //res.end('Inserted: ' + result.insertedId)
        }
      });
    });
     
});

function update(db,o_id,name,borough,cuisine,street,building,zipcode,gpslon,gpslat,bfile,rate,author,callback) {
  console.log('db in updatefuncion!');
console.log('oid in sql!:'+ o_id);
console.log('borough in sql!:'+ borough);
  db.collection('restaurant').replaceOne({"_id":o_id},
    {
    "name" : name,
    "borough" : borough,
    "cuisine": cuisine,
    "address":{"street": street, "building" : building, "zipcode" :zipcode,"coord":[gpslon,gpslat]},
    "data" : new Buffer(bfile.data).toString('base64'),
    "mimetype" : bfile.mimetype,
    "author":author,
    "rates":rates
	 
  }, function(err,result) {
    //assert.equal(err,null);
    if (err) {
      console.log('insertOne Error: ' + JSON.stringify(err));
      result = err;
    } else {
      console.log("UPDATE SUCCESSFUL " );
	
    }
    callback(result);
    
  });
}

app.get('/delete',function(req,res){
    console.log('deletedoc@/delete = ' + deletedoc);
	
	if(deletedoc==true){
    MongoClient.connect(mongourl,function(err,db){
	console.log('connected to db');
	console.log('finding key o_id= ' + o_id);
		
	db.collection('restaurant').remove({"_id":o_id},function(err,result){
	if(err){
		console.log(err);
		}
		console.log('del finish');
		//console.log(result);
		
	});
	
	db.close();
	res.redirect('/read');
});
}else{res.end("[Auth]Not owner of this post");}		
});

app.get('/rate',function(req,res){
	MongoClient.connect(mongourl,function(err,db){
	console.log("connect to db/rate");
	console.log("o_id@/rate:"+o_id);
	db.collection('restaurant').findOne({"_id" : o_id}, function(err, doc){
	for(var i =0; i<doc.rates.length;i++){
	console.log('doc.rates[0].rate:' + doc.rates[0].rate);
		if (req.session.username==doc.rates[i].rate_name){
		 	res.write("You have rated already");}else{
			res.sendFile(__dirname + '/public/rateform.html');
				}
	}
});	
});
});

app.post('/rate',function(req,res){
    MongoClient.connect(mongourl,function(err,db){
	console.log("connect to db/rate");
	var rate = req.body.rate;
	console.log("rate:"+rate);
	db.collection('restaurant').update({"_id" : o_id},
		{$push:{"rates":{$each:[{"rate_name":req.session.username,"rate":rate}]}}}, 
		function(err){
			if(!err){console.log('push rate record is successful');
			res.redirect('/read');			
			}
});
		db.close();	
});
		
});


app.get('/api/read/name/:name',function(req,res){
	 MongoClient.connect(mongourl,function(err,db){
	var name = req.params.name;
	var result = null;
	if (name != null) {
      db.collection('restaurant').findOne({"name" : name}, function(err, doc){
      assert.equal(err, null); 
	result = JSON.stringify(doc);
	res.end(result);
	//console.log("JSON.stringify(doc):"+ result);
	});
	}
	db.close();
});
});

app.get('/api/create',function(req,res){
	res.sendFile(__dirname + '/public/form.html');	
});

app.get('/',function(req,res){
	res.redirect('/login');
});
	

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);


