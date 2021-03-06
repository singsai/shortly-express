var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');


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
  resave: false,
  saveUninitialized: true
}));

app.get('/', 
function(req, res) {  
  console.log('You ARE NOT LOGGED IN? ', req.session.username);
  // if (util.checkUser(req)) {    
  res.render('index');  
  // } 
});

app.get('/login',   
function(req, res) {
  res.render('login');
  // console.log('req.session.userId: ', req.session.userId);
  // console.log('req.session.username: ', req.session.username);
});

app.post('/login',   
function(req, res) {

  if (req.session.error) {
    console.log('req.session.error');
  } else {    
    req.session.username = req.body.username;

    User.where('username', req.session.username).fetch().
      then(function(user) {        
        var hash = bcrypt.hashSync(req.body.password, user.get('salt'));

        // console.log('comparing: ', bcrypt.compareSync(user.get('password'), hash));
        // console.log('User.GET: ', user.get('password'));
        // console.log('THE HASH: ', hash);
        if (user.get('password') === hash) {
          // console.log('userID: ', user.get('id'));
          res.redirect('/');  
        } else {          
          console.log('Your password is invalid');
          res.redirect('/login');
        }   
      });
  }
});

app.get('/logout', 
function(req, res) {
  req.session.username = undefined;
  res.redirect('/login');
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
  
  var salt = bcrypt.genSaltSync();
  var hash = bcrypt.hashSync(req.body.password, salt);
  
  Users.create({
    username: req.body.username,
    password: hash,
    salt: salt
  })
  .then(function(user) {
    //res.send(user);
    console.log('Redirection to home page');
    res.redirect('/');
  });

});

app.get('/create', 
function(req, res) {
  if (util.checkUser(req)) {
    res.render('index');
  } else {
    res.redirect('/login'); //IF NOT LOGGED  
  }  
});

app.get('/links', 
function(req, res) {
  // console.log('IN LINKS and Logged in As: ', req);

  // res.redirect('/login'); //IF NOT LOGGED
  if (util.checkUser(req)) {
    // console.log('username: ', req.session.username);

    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });    
     
  } else {
    res.redirect('/login'); //IF NOT LOGGED  
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

        User.where('username', req.session.username).fetch().
          then(function(user) { 
            Links.create({
              url: uri,
              title: title,
              baseUrl: req.headers.origin,
              userId: user.id
            })
            .then(function(newLink) {
              res.status(200).send(newLink);
            });
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
