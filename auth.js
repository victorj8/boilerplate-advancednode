'use strict';
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local');
const GitHubStrategy = require('passport-github')
const ObjectID = require('mongodb').ObjectID;
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  passport.use(new LocalStrategy(
    function(username, password, done) {
        myDataBase.findOne({username: username}, function(err,user){
        console.log('User ' + username + ' attempted to log in');
        if(err) { return done(err); }
        if(!user) { return done(null, false); }
        if(!bcrypt.compareSync(password, user.password)) { 
            return done(null, false); 
        }
        return done(null, user);
        })
    }
  ));

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback'
  },
    function(accessToken, refreshToken, profile, cb) {
        myDataBase.findOneAndUpdate(
            { id: profile.id },
            {
                $setOnInsert: {
                    id: profile.id,
                    name: profile.displayName || 'John Doe',
                    photo: profile.photos[0].valie || '',
                    email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
                    created_on : new Date(),
                    provider: profile.provider || ''
                },
                $set: {
                    last_login: new Date()
                },
                $inc: {
                    login_count: 1
                }
            },
            {upsert: true, new: true},
            (err, doc) => {
                return cb(null, doc.value);
            }
          )
    }
  ));

  // Serialization and deserialization here...
  passport.serializeUser((user, done)=>{
    done(null, user._id);
  });
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({_id: new ObjectID(id)}, (err, doc) => {
      done(null, doc);
    });
  });
}