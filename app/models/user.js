var db = require('../config');
var Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  validate: function(hash) {
    return hash === this.get('password');
  }
});

module.exports = User;