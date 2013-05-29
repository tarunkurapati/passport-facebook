var express = require('express')
  , passport = require('passport')
  , redis = require('redis')
  , util = require('util')
  , fs = require('fs')
  , Canvas = require('canvas')
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
       //console.log(result); 
              console.log("<<<<<<<< Results >>>>>>>>>>");
       for(i=0;i<result.length;i++){
          if(resarr[i] == result[i]){
            console.log("right"); 
            resultarr.push("right");
          }else{
          console.log("wrong"); 
            resultarr.push("wrong");
              }
       }

   var canvas = new Canvas(650, 650)
      , ctx = canvas.getContext('2d')
      , Image = Canvas.Image
        , fs = require('fs');

var img = new Image;
img.onload = function() {
    console.log("i am in image onload");
        ctx.drawImage(img, 0, 0, 50, 50, 0, 0, 50, 50);

        var out = fs.createWriteStream(__dirname + '/public/resimg/text'+req.user+'.png')
          , stream = canvas.createPNGStream();
          stream.on('data', function(chunk){
                out.write(chunk);
                res.render('result', { user: req.user });
          });
}
img.onerror = function(error) {
    console.log(error);

}
console.log("loading image");
img.src = 'http://d3gtl9l2a4fn1j.cloudfront.net/t/p/w500/jjAq3tCezdlQduusgtMhpY2XzW0.jpg';


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
      form.append('file', fs.createReadStream(__dirname+'/public/resimg/text'+req.user+'.png')); //Put file
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
                    fs.unlink(__dirname+'/public/resimg/text'+req.user+'.png', function (err) {
                          if (err) throw err;
                            console.log('successfully deleted /public/resimg/text'+req.user+'.png');
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
