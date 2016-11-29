var db = require('../config');
var Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true
});

module.exports = User;