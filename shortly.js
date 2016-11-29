var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var session = require('express-session');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.set('trust proxy', 1); // trust first proxy

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: true }
}));

app.get('/', 
function(req, res) {  
  console.log('You ARE NOT LOGGED IN? ', req.session.sessionID);
  if (req.session.sessionID) {    
    res.render('index');  
  } else {
    res.redirect('/login'); //IF NOT LOGGED
  }
});

app.get('/login',   
function(req, res) {
  res.render('login');
  //console.log('REQUEST.SESSION', req.session);
  console.log('req.sessionID: ', req.sessionID);
  //something
});

app.post('/login',   
function(req, res) {
  if (req.session.error) {
    console.log('req.session.error');
  } else {
    console.log('req.sessionID: ', req.sessionID);

    // if (req.body.username) {
    //   req.session.cookie.username = req.body.username;
    // }
  }
  //res.render('login');
  //console.log('REQUEST.SESSION', req.session);
  //something
});

app.get('/logout', 
function(req, res) {

  store.clear(function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log(req.session);
    }
  });

  req.session.destroy(function() {
    res.redirect('/');
  });
});

app.get('/signup', 
function(req, res) {
  res.render('signup');  
  //something
});

app.post('/signup', 
function(req, res) {
  console.log('signing up');
  //something
});

app.get('/create', 
function(req, res) {
  res.redirect('/login'); //IF NOT LOGGED
  res.render('index');
});

app.get('/links', 
function(req, res) {
  console.log('IN LINKS and Logged in As: ', req);

  // res.redirect('/login'); //IF NOT LOGGED
  if (req.session.sessionID) {
    res.redirect('/login'); //IF NOT LOGGED
     
  } else {
  
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });    
  
   }

});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
