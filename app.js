/**
 * Module dependencies.
 */
var express = require('express')
    //, mongoose = require('mongoose')
    , routes = require('./routes')
    , util = require('util')
    //, middleware = require('./middleware')
    //, timemap = require('./timemap')
    , passport = require('passport')
    , OpenStreetMapStrategy = require('passport-openstreetmap').Strategy
    , config = require('./config')
    , util = require('util')
    , xml = require('node-xml')
    , request = require('request')
    , qs = require('querystring')
    , bz2 = require('node-bzip')
    ;

var redis;

passport.serializeUser(function(user, done) {
  //console.log(user);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var OSMStrategy = new OpenStreetMapStrategy({
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
      return done(null, { profile: profile, token: token, tokenSecret: tokenSecret });
    });
  }
);

passport.use(OSMStrategy);

  //var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;
  //mongoose.connect(db_uri);
  
  if (process.env.REDISTOGO_URL) {
    //console.log("p1");
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    //console.log("p2");
    redis = require("redis").createClient(rtg.port, rtg.hostname);
    //console.log("p3");
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
    app.use(express.session({ secret: process.env.EXPRESS_SESSION_SECRET || 'secret', maxAge: 360*5 }));
    //app.use(express.cookieSession({ secret: process.env.EXPRESS_SESSION_SECRET2, maxAge: 360*5 }));
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
    request.get({
      url: 'http://api.openstreetmap.org/api/0.6/user/gpx_files',
      oauth: {
        consumer_key: process.env.OPENSTREETMAP_CONSUMER_KEY,
        consumer_secret: process.env.OPENSTREETMAP_CONSUMER_SECRET,
        token: req.user.token,
        token_secret: req.user.tokenSecret
      }
    }, function(e, r, body){
      var mytracks = [ ];
      var parser = new xml.SaxParser(function(alerts){
        alerts.onStartElementNS(function(elem, attarray, prefix, uri, namespaces){
          if(elem == "gpx_file"){
            var attrs = { };
            for(var a=0;a<attarray.length;a++){
              attrs[ attarray[a][0] ] = attarray[a][1];
            }
            mytracks.push( attrs["id"] );
          }
        });
        alerts.onEndDocument(function(){
          //res.json(mytracks);
          //for(var t=0;t<mytracks.length;t++){
          var t=0;
            request.get({
              url: 'http://api.openstreetmap.org/api/0.6/gpx/' + mytracks[t] + '/data',
              oauth: {
                consumer_key: process.env.OPENSTREETMAP_CONSUMER_KEY,
                consumer_secret: process.env.OPENSTREETMAP_CONSUMER_SECRET,
                token: req.user.token,
                token_secret: req.user.tokenSecret
              },
              encoding: null
            }, function(e, r, buffer){
              var output = bz2( buffer );
              res.send( output.toString() );
            });
          //}
        });
      });
      parser.parseString(body);
    });
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