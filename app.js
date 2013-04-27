/**
 * Module dependencies.
 */
var express = require('express')
    //, mongoose = require('mongoose')
    , routes = require('./routes')
    , util = require('util')
    //, middleware = require('./middleware')
    //, request = require('request')
    //, timemap = require('./timemap')
    , passport = require('passport')
    , OpenStreetMapStrategy = require('passport-openstreetmap').Strategy
    , config = require('./config')
    , util = require('util')
    ;

var redis;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new OpenStreetMapStrategy({
    consumerKey: process.env.OPENSTREETMAP_CONSUMER_KEY,
    consumerSecret: process.env.OPENSTREETMAP_CONSUMER_SECRET,
    callbackURL: "http://www.cruncht.im/account"
  },
  function(token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's OpenStreetMap profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the OpenStreetMap account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

  //var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;
  //mongoose.connect(db_uri);
  
  if (process.env.REDISTOGO_URL) {
    console.log("p1");
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    console.log("p2");
    redis = require("redis").createClient(rtg.port, rtg.hostname);
    console.log("p3");
    redis.auth(rtg.auth.split(":")[1]);
  }

  var app = express.createServer();

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { pretty: true });

    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.session({ secret: process.env.EXPRESS_SESSION_SECRET || 'secret' }));
    app.use(express.static(__dirname + '/public'));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: false}));
  });
  
  // Routes
  app.get('/', function(req, res){
    res.render('homepage', { json: "" });
  });
  
  app.post('/map', function(req, res){
    //var tm = new timemap.TimeMap({
    //  json: req.body.json
    //});
    //tm.save(function(err){
    //  res.send({ outcome: ( err || tm._id ) });
    //});
    var specialkey = Math.round( Math.random() * 1000000000 ) + "";
    redis.set(specialkey, req.body.json);
    res.send({ outcome: specialkey });
  });

  app.get('/map/:byid', function(req, res){
    //timemap.TimeMap.findById(req.params.byid, function(err, map){
    //  res.render('homepage', { json: map.json });
    //});
    redis.get(req.params.byid, function(err, reply){
      if(err){
        return res.send(err);
      }
      res.render('homepage', { json: reply });
    });
  });
  
  app.get('/login', function(req, res){
    res.render('login', { user: req.user });
  });
  app.get('/account', passport.authenticate('openstreetmap', { failureRedirect: '/login' }), function(req, res){
    res.json( req.user );
    //res.render('homepage', { json: '' });
  });
  app.get('/auth/openstreetmap', passport.authenticate('openstreetmap'), function(req, res){
    res.send('hello 1');
  });
  /*app.get('/auth/openstreetmap/callback', passport.authenticate('openstreetmap', { failureRedirect: '/login' }), function(req, res) {
    res.send('hello2');
  });*/
  
  var replaceAll = function(src, oldr, newr){
    while(src.indexOf(oldr) > -1){
      src = src.replace(oldr, newr);
    }
    return src;
  };

  //app.get('/auth', middleware.require_auth_browser, routes.index);
  //app.post('/auth/add_comment',middleware.require_auth_browser, routes.add_comment);
  
  // redirect all non-existent URLs to doesnotexist
  app.get('*', function onNonexistentURL(req,res) {
    res.render('doesnotexist',404);
  });

app.listen(process.env.PORT || 3000);