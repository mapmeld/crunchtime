/**
 * Module dependencies.
 */
var express = require('express')
    //, mongoose = require('mongoose')
    , routes = require('./routes')
    //, middleware = require('./middleware')
    //, request = require('request')
    //, timemap = require('./timemap')
    ;

var redis;

var init = exports.init = function (config) {
  
  //var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;
  //mongoose.connect(db_uri);
  
  redis = require("redis").createClient();
  if (process.env.REDISTOGO_URL) {
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    redis = require("redis").createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(":")[1]);
  }

  var app = express.createServer();

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { pretty: true });

    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
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

  return app;
};

// Don't run if require()'d
if (!module.parent) {
  var config = require('./config');
  var app = init(config);
  app.listen(process.env.PORT || 3000);
  console.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}