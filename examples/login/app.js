var express = require('express')
  , passport = require('passport')
  , redis = require('redis')
  , util = require('util')
  , fs = require('fs')
  , gm = require('gm')
  , Canvas = require('canvas')
  , async = require('async')
  , request = require('request')
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , client = redis.createClient()
  , FacebookStrategy = require('passport-facebook').Strategy;


var FACEBOOK_APP_ID = "396690173779104"
var FACEBOOK_APP_SECRET = "695516a6c8de737fa8d48414d3e970da";
	

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Facebook profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      console.log("<<<<<<<<<<<< User profile >>>>>>>>>>>>");
      console.log(profile);
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's Facebook profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Facebook account with a user record in your database,
      // and return that user instead.
        var hkey = "users:fbuser:"+profile.id;
        var hfield = "displayName";
        var hvalue = profile.displayName;
        var hfield1 = "accessToken";
        var hvalue1 = accessToken;
        var hfield2 = "refreshToken";
        var hvalue2 = refreshToken;
        var hfieldraw= "rawdata";
        var hvalueraw = profile._raw;
        var params = { id: profile.id }
        client.hexists(hkey,hfield,function(error,result){
            if(error) console.log("hexits error" +error);
            else{
                if(result==0){
                    client.hmset(hkey,hfield,hvalue,hfield1,hvalue1,hfield2,hvalue2,hfieldraw,hvalueraw,function(error,result){
                        if(error) console.log("user create error : " +error);
                        else {
                            console.log("user created flag : " +result);
                            done(null, profile.id);
                        }
                    });
                }else{
                    console.log("user already exists");
                    done(null, profile.id);
                }
            }
        });
        //return done(null, profile);
    });
  }
));

var engine = require('ejs-locals');

                    //fs.unlink(__dirname+'/public/resimg/text'+req.user+'.png', function (err) {
var http= require('https');
var privateKey = fs.readFileSync(__dirname+'/public/cert/ssl.key').toString();
var certificate = fs.readFileSync(__dirname+'/public/cert/visesha.com.crt').toString();  
var dad = fs.readFileSync(__dirname+'/public/cert/gd_bundle.crt').toString();

var credentials={key: privateKey, cert: certificate, ca: dad};
var app = express();
 
 // to enable https
var https = http.createServer(credentials,app);
https.listen(443);


//use ejs-locals for all ejs templates
app.engine('ejs',engine);

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());

    // extending req object with redis client connection - have to above app.router
    app.use(function (req, res, next) {
        req.client = client;
        next();
    });
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});



app.all('/', function(req, res){
  res.render('index', { user: req.user });
});


app.get('/account', ensureAuthenticated, function(req, res){
    console.log(req.query["lang"]);
    var client = req.client; 
    var myset ="members:"+req.query.lang;
    //get random ids
    console.log("<<<<<<<< Get random movies >>>>>>>>>>>");
    client.srandmember(myset,5,function(err,result){
        if(err){
            res.end("cannot proceed to srandmember");
        }else{
            console.log("result from database" +result);
            var randomarr=result;
            var hashkey ="mid:"+req.query.lang;
            client.hmget(hashkey,randomarr[0],randomarr[1],randomarr[2],randomarr[3],randomarr[4],function(error,result){
                if(err){
                    res.end("cannot proceed to srandmember");
                }else{
                    var questions = [];
                    for (var i=0; i < result.length; i++){
                        questions.push(JSON.parse(result[i]));
                    }
                    console.log(questions);
                    res.render('account', { user: req.user, data: questions});
                }    
            });
        }
    });
});


app.post('/result', ensureAuthenticated, function(req, res){
    console.log(req.body.m);
    var m= req.body.m;
    //console.log(req.body.m[0]);
    var myarr=[];
    var resarr=[];
    for(prop in m){
        myarr.push(prop.slice(1));
        resarr.push(m[prop]);
    }
    client.hmget("answers",myarr[0],myarr[1],myarr[2],myarr[3],myarr[4],function(error,result){
        var resultarr=[];
       console.log(result); 
       console.log("<<<<<<<< Results >>>>>>>>>>");
       for(i=0;i<result.length;i++){
          if(resarr[i] == result[i]){
            console.log("right"); 
            resultarr.push("✔");
          }else{
          console.log("wrong"); 
            resultarr.push("x");
              }
       }

    client.hmget("posters",myarr[0],myarr[1],myarr[2],myarr[3],myarr[4],function(error,result){
            var posterarr= [];
            
       for(i=0;i<result.length;i++){
          posterarr.push(result[i]);  
        }


        async.parallel([
            //Load user
            function(callback) {
                var uri = posterarr[0];
                var filename= "0.jpg"
                request.head(uri, function(err, res, body){
                    console.log('content-type:', res.headers['content-type']);
                    console.log('content-length:', res.headers['content-length']);
                    var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                    picStream.on('close', function() {
                        console.log('file 0 save done');
                    });
                    request(uri).pipe(picStream);
                    callback(); 
                });
            },
            //Load posts
            function(callback) {
                var uri = posterarr[0];
                var filename= "1.jpg"
                request.head(uri, function(err, res, body){
                    console.log('content-type:', res.headers['content-type']);
                    console.log('content-length:', res.headers['content-length']);
                    var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                    picStream.on('close', function() {
                        console.log('file 1 save done');
                    });
                    request(uri).pipe(picStream);
                    callback(); 
                });
            },
            function(callback) {
                var uri = posterarr[0];
                var filename= "2.jpg"
                request.head(uri, function(err, res, body){
                    console.log('content-type:', res.headers['content-type']);
                    console.log('content-length:', res.headers['content-length']);
                    var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                    picStream.on('close', function() {
                        console.log('file 2 save done');
                    });
                    request(uri).pipe(picStream);
                    callback(); 
                });
            },
            //Load posts
            function(callback) {
                var uri = posterarr[0];
                var filename= "3.jpg"
                request.head(uri, function(err, res, body){
                    console.log('content-type:', res.headers['content-type']);
                    console.log('content-length:', res.headers['content-length']);
                    var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                    picStream.on('close', function() {
                        console.log('file 3 save done');
                    });
                    request(uri).pipe(picStream);
                    callback(); 
                });
            },
            function(callback) {
                var uri = posterarr[0];
                var filename= "4.jpg"
                //request.head(uri, function(err, res, body){
                 //   console.log('content-type:', res.headers['content-type']);
                  //  console.log('content-length:', res.headers['content-length']);
                    //var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                    /*picStream.on('close', function() {
                        console.log('file 4 save done');
                    }); */
                    request(uri, function(error,res,body){
                    //   console.log(res); 
                    var data = new Buffer(parseInt(res.headers['content-length'],10));
                      res.setEncoding('utf8');

                    //var data = '';
                    var pos = 0;
                    res.on('error', function(e){
                       console.log(e.message); 
                        
                        });
                    res.on('data', function(chunk) {
                      chunk.copy(data, pos);
                      pos += chunk.length;
                        console.log("in data");
                    });
                    res.on('end', function () {
                      img = new Canvas.Image;
                      img.src = data;
                      ctx.drawImage(img, 0, 0, img.width, img.height);
                      var out = fs.createWriteStream(__dirname + '/my-out4.png')
                        , stream = outCanvas.createPNGStream();
                        console.log("in end");

                      stream.on('data', function(chunk){
                        out.write(chunk);
                        console.log("in chunk");
                      });
                      stream.on('end', function(){
                        console.log("in write end");
                      });
                    });
                        
                        
                        });
                    callback(); 
                //});
            }
        ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
            if (err) return next(err); //If an error occured, we let express/connect handle it by calling the "next" function
            //Here locals will be populated with 'user' and 'posts'
            //res.render('user-profile', locals);

                    mkdirp(__dirname+'/public/resimg/'+req.user, function (err) {
                        if (err) console.error(err)
                            else {
                               console.log('created dir!')

/*


var fs = require('fs'),
    http = require('http'),
url = require('url');

var outCanvas = new Canvas(1000, 750);
var ctx = outCanvas.getContext('2d');

http.get(
    {
        host: 'farm8.staticflickr.com',
        port: 80,
        path: '/7108/7038906747_69a526f070_z.jpg'
    },
    function(res) {
                    var data = new Buffer(parseInt(res.headers['content-length'],10));
                    var pos = 0;
                    res.on('data', function(chunk) {
                      chunk.copy(data, pos);
                      pos += chunk.length;
                    });
                    res.on('end', function () {
                      img = new Canvas.Image;
                      img.src = data;
                      ctx.drawImage(img, 0, 0, img.width, img.height);
                      var out = fs.createWriteStream(__dirname + '/my-out.png')
                        , stream = outCanvas.createPNGStream();

                      stream.on('data', function(chunk){
                        out.write(chunk);
                      });
                    });

    }
);

*/



                                //var out = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/fb.png')
/*
gm(__dirname + '/public/resimg/'+req.user+'/fb.png')
.resize(353, 257)
.autoOrient()
.write(writeStream, function (err) {
      if (!err) console.log(' hooray! ');
});
*/
//gm(__dirname + '/public/resimg/'+req.user+'/fb.png').background("black");
//gm("img.png").background("black");
/*
 var resizeX = 343
   , resizeY = 257

//   gm('/path/to/image.jpg')
gm(__dirname + '/public/resimg/'+req.user+'/fb.png')
   .colorize(200, 200, 256)
   .resize(resizeX, resizeY)
   .autoOrient();
   .write(response, function (err) {
         if (err) err
             console.log(check the image);
   });



                    var canvas = new Canvas(650, 650)
                    , ctx = canvas.getContext('2d');

var stream =fs.createReadStream(__dirname + '/public/resimg/'+req.user+'/1.jpg'); 
stream
*/


                    /*
                    fs.readFile(__dirname + '/public/resimg/'+req.user+'/1.jpg', function(err, squid){
                          if (err) throw err;
                            img = new Canvas.Image;
                              img.src = squid;
                              img.onload = function(){
                                  console.log("ian here in onload");
                                ctx.drawImage(img, 0, 0, img.width / 4, img.height / 4);
                              }
                    });

*/



                               /*
                               var canvas = new Canvas(650, 650)
                               , ctx = canvas.getContext('2d')
                               , Image = Canvas.Image
                               , fs = require('fs');


                                var x = canvas.width / 2;
                                var y = canvas.height / 12;

                                ctx.beginPath();
                                ctx.rect(0, 0, 650, 100);
                                ctx.fillStyle = '#303030';
                                ctx.fill();


                                ctx.font = 'italic 26pt Calibri';
                                ctx.textAlign = 'center';
                                ctx.fillStyle = '#f8f8f8';
                                ctx.fillText('Guesss the movie by Screenshot!', x, y);


                                ctx.font = '20pt Calibri';
                                ctx.textAlign = 'center';
                                ctx.fillStyle = '#202020';



                                ctx.fillText('1.'+resultarr[0], 100, 200);
                                ctx.fillText('2.'+resultarr[1], 100, 300);
                                ctx.fillText('3.'+resultarr[2], 100, 400);
                                ctx.fillText('4.'+resultarr[3], 100, 500);
                                ctx.fillText('5.'+resultarr[4], 100, 600);

  var parse = require('url').parse;



var url = parse('https://assets0.github.com/img/89d8e6624fb9153c40bd11ae7592a74e058d873e?repo=&url=http%3A%2F%2Fsphotos.ak.fbcdn.net%2Fhphotos-ak-snc3%2Fhs234.snc3%2F22173_446973930292_559060292_10921426_7238463_n.jpg&path=');

http.get({
    path: url.pathname + url.search
  , host: url.hostname
}, function(res){
  var buf = '';
  res.setEncoding('binary');
  res.on('data', function(chunk){ buf += chunk });
  res.on('end', function(){
    var img = new Image;
img.onload = function(){  
    console.log("in imag onload"); 
     
     
      ctx.drawImage(img, 0, 0);
   // fs.writeFile('/tmp/tobi.png', canvas.toBuffer());



                                var out = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/fb.png')
                                , stream = canvas.createPNGStream();
                                stream.on('data', function(chunk){
                                    out.write(chunk);
                                    res.render('result', { user: req.user });
                                });
       };

    img.src = new Buffer(buf, 'binary');



  });
});

*/



                  //  var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                  /*  var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
                    picStream.on('close', function() {
                        console.log('file 4 save done');
                    });
                    request(uri).pipe(picStream); */

/*
    fs.readFile(__dirname + '/public/resimg/'+req.user+'/0.jpg', function(err, data) {
        if (err) throw err;
        var img = new Canvas.Image; // Create a new Image
        console.dir("image data "+data);
        img.src = data;
   //     img.onload = function() {
            console.log("in image onload");
                //    context.drawImage(imageObj, 69, 50);
                //ctx.drawImage(img, 0, 0, img.width / 4, img.height / 4);
                                var out = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/fb.png')
                                , stream = canvas.createPNGStream();
                                stream.on('data', function(chunk){
                                    out.write(chunk);
                                    res.render('result', { user: req.user });
                                });

    //                     };



                               // ctx.drawImage(images.darthV, 100, 30, 200, 137);
                               // ctx.drawImage(images.yoda, 350, 55, 93, 104);



        }); */






















                            }
                    });
            });
        });



/*

// get image url from redis data 
// get wrong options from post request


// download a file
var download = 

function(uri, filename){
    request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);
    var picStream = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/'+filename);
    picStream.on('close', function() {
    console.log('file save done');
});
    request(uri).pipe(picStream);
  });
};
download('https://www.google.com/images/srpr/logo3w.png', 'google.png');
                
                
 */               
                





    }); // hmget results end
}); // post end


app.post('/postonfb', ensureAuthenticated, function(req, res){
    var params =req.body; 
    console.log(params);
    var https = require('https'); //Https module of Node.js
    var fs = require('fs'); //FileSystem module of Node.js
    var FormData = require('form-data'); //Pretty multipart form maker.
    client.hget("users:fbuser:"+req.user,"accessToken",function(err,result){


    var ACCESS_TOKEN = result;
      
    var form = new FormData(); //Create multipart form
      form.append('file', fs.createReadStream(__dirname+'/public/resimg/'+req.user+'/fb.png')); //Put file
      form.append('message', params.message); //Put message
       
       //POST request options, notice 'path' has access_token parameter
       var options = {
               method: 'post',
                   host: 'graph.facebook.com',
                       path: '/me/photos?access_token='+ACCESS_TOKEN,
                           headers: form.getHeaders(),
       }
        
        //Do POST request, callback for response
        var request = https.request(options, function (response){
                 // fb response
                  response.on('data', function (chunk) {
                                console.log('Response: ' + chunk);
                                      });
                 //res.end('');
                 // remove the file
                 if(response.statusCode==200){
                    console.log("fb posted"); 
                    rimraf(__dirname+'/public/resimg/'+req.user, function (err) {
                          if (err) throw err;
                            console.log('successfully deleted /public/resimg/'+req.user+' : folder');
                            res.redirect('/final')
                    });
                 }
        });
         
         //Binds form to request
         form.pipe(request);
          
          //If anything goes wrong (request-wise not FB)
          request.on('error', function (error) {
                   console.log(error);
          });


    }); 



});

//final step
app.get('/final', ensureAuthenticated, function(req, res){
    res.render('final', { user: req.user });
});

// Movie Insert
app.get('/minsert', ensureAuthenticated, function(req, res){
    res.render('minsert', { user: req.user });
});

app.post('/minsert', ensureAuthenticated, function(req, res){
    var params =req.body; 
    console.log(params);
    var langid =params.lang;
    var answer = params.answer;
    var client = req.client; 
    client.incr("movie.nextID",function(err,result){
        if(err){
            res.end("cannot proceed to srandmember");
        }else{
            console.log("new movie ID",result);
            var mid =result;
            var memberset ="members:"+langid;
            data = {
                mid: result,
                screenshot: params.url,
                options : [params.option1,params.option2,params.option3,params.option4],
            };
            client.hset("posters",mid,data.screenshot,function(error,result){
                if(err){
                    res.end("cannot proceed to posters");
                }else{
                    console.log("poster saved"); 
               } 
                
            });
            var stringdata = JSON.stringify(data);
            client.sadd(memberset,mid,function(err,result){
                if(err){
                    res.end("cannot proceed to srandmember");
                }else{
                    console.log("new movie ID",result);
                    client.hset("answers",mid,answer,function(err,result){
                        if(err){
                            res.end("cannot proceed to srandmember");
                        }else{
                            console.log("result from database" +result);
                            var hakey="mid:"+langid;
                            var field=mid;
                            client.hset(hakey,field,stringdata,function(err,result){
                                if(err){
                                    res.end("cannot proceed to srandmember");
                                }else{
                                    console.log("result from database" +result);
                                    res.end('finally movie entry completed');
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email', 'publish_stream'] }),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3999);
console.log("running on port 3999");

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
