'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const myDB = require('./connection');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  passport.use(new LocalStrategy(
    function(username, password, done) {
      myDataBase.findOne({username: username}, function(err,user){
        console.log('User ' + username + ' attempted to log in');
        if(err) { return done(err); }
        if(!user) { return done(null, false); }
        if(password !== user.password) { return done(null, false); }
        return done(null, user);
      })
    }
  ));

  function ensureAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
      return next();
    }
    res.redirect('/');
  }

  // Be sure to change the title
  app.route('/').get((req, res) => {
    //Change the response to render the Pug template
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true
    });
  });

  app
    .route('/profile')
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd + '/views/pug/profile', {
        username: req.user.username
      });
    });

  app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.render(process.cwd + '/views/pug/profile', {
      user: req.user
    });
  });

  // Serialization and deserialization here...
  passport.serializeUser((user, done)=>{
    done(null, user._id);
  });
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({_id: new ObjectID(id)}, (err, doc) => {
      done(null, doc);
    });
  });
  
  // Be sure to add this...
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
