var express = require('express')
  , passport = require('passport')
  , redis = require('redis')
  , util = require('util')
  , fs = require('fs')
  , Canvas = require('canvas')
  , async = require('async')
  , request = require('request')
  , mkdirp = require('mkdirp')
  , http = require('http')
  , url = require('url')
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
        client.hset(hkey,hfield1,hvalue1);
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
        var correctarr=[];
        console.log(result); 
        console.log("<<<<<<<< Results >>>>>>>>>>");
        for(i=0;i<result.length;i++){
            if(resarr[i] == result[i]){
                console.log("right"); 
                resultarr.push("✔");
                correctarr.push("✔");
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
                               var canvas = new Canvas(800, 800)
                               , ctx = canvas.getContext('2d');



                                var x = canvas.width / 2;
                                var y = canvas.height / 12;

                                ctx.beginPath();
                                ctx.rect(0, 0, 800, 100);
                                ctx.fillStyle = '#303030';
                                ctx.fill();


                                ctx.font = 'italic 26pt Calibri';
                                ctx.textAlign = 'center';
                                ctx.fillStyle = '#f8f8f8';
                                ctx.fillText('Guess the movie by Screenshot!', x, y);


                                ctx.font = '20pt Calibri';
                                ctx.textAlign = 'center';
                                ctx.fillStyle = '#202020';



                                ctx.fillText('1.'+resultarr[0], 300, 220);
                                ctx.fillText('2.'+resultarr[1], 300, 350);
                                ctx.fillText('3.'+resultarr[2], 300, 480);
                                ctx.fillText('4.'+resultarr[3], 300, 610);
                                ctx.fillText('5.'+resultarr[4], 300, 740);
                                
                               
                              var radius = 120;

                              ctx.beginPath();
                              ctx.arc(550,480, radius, 0, 2 * Math.PI, false);
                              ctx.lineWidth = 5;
                              ctx.strokeStyle = '#003300';
                              ctx.stroke(); 
                              ctx.font = 'italic 45pt Calibri';
                              ctx.fillText(+correctarr.length+'/5', 550, 500);
        async.parallel([
            //Load user
            function(callback) {
                    http.get(
                        {
                            host: 'd3gtl9l2a4fn1j.cloudfront.net',
                            port: 443,
                            path: "https://d3gtl9l2a4fn1j.cloudfront.net/t/p/w185/"+posterarr[0] 
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
                                ctx.drawImage(img, 50, 150, img.width, img.height);
                                callback(); 
                            });
                        }
                    ).on('error',function(e){
                            console.log("error img load : "+e); 
                        });
            },
            //Load posts
            function(callback) {
                    http.get(
                        {
                            host: 'd3gtl9l2a4fn1j.cloudfront.net',
                            port: 443,
                            path: "https://d3gtl9l2a4fn1j.cloudfront.net/t/p/w185/"+posterarr[1] 
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
                                ctx.drawImage(img, 50, 280, img.width, img.height);
                                callback(); 
                            });
                        }
                    ).on('error',function(e){
                            console.log("error img load : "+e); 
                        });
            },
            function(callback) {
                    http.get(
                        {
                            host: 'd3gtl9l2a4fn1j.cloudfront.net',
                            port: 443,
                            path: "https://d3gtl9l2a4fn1j.cloudfront.net/t/p/w185/"+posterarr[2] 
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
                                ctx.drawImage(img, 50, 410, img.width, img.height);
                                callback(); 
                            });
                        }
                    ).on('error',function(e){
                            console.log("error img load : "+e); 
                        });
            },
            //Load posts
            function(callback) {


                    http.get(
                        {
                            host: 'd3gtl9l2a4fn1j.cloudfront.net',
                            port: 443,
                            path: "https://d3gtl9l2a4fn1j.cloudfront.net/t/p/w185/"+posterarr[3] 
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
                                ctx.drawImage(img, 50, 540, img.width, img.height);
                                callback(); 
                            });
                        }
                    ).on('error',function(e){
                            console.log("error img load : "+e); 
                        });

            },
            function(callback) {
                    http.get(
                        {
                            host: 'd3gtl9l2a4fn1j.cloudfront.net',
                            port: 443,
                            path: "https://d3gtl9l2a4fn1j.cloudfront.net/t/p/w185/"+posterarr[4] 
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
                                ctx.drawImage(img, 50, 670, img.width, img.height);
                                callback(); 
                            });
                        }
                    ).on('error',function(e){
                            console.log("error img load : "+e); 
                        });

            }
        ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
            if (err) return next(err); //If an error occured, we let express/connect handle it by calling the "next" function
            //Here locals will be populated with 'user' and 'posts'
            //res.render('user-profile', locals);
            mkdirp(__dirname+'/public/resimg/'+req.user, function (err) {
                if (err) console.error(err)
                else {
                    console.log('created dir!')
                    var out = fs.createWriteStream(__dirname + '/public/resimg/'+req.user+'/fb.png')
                    , stream = canvas.createPNGStream();
                    stream.on('data', function(chunk){
                        out.write(chunk);
                    });
                    res.redirect('/result')
                    

    }
     // hmget results end
                    });
    });
    });
    });
    });


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

app.get('/result', ensureAuthenticated, function(req, res){
    res.render('result', { user: req.user });
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
    res.redirect('https://apps.facebook.com/moviebyscreenshot');
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
